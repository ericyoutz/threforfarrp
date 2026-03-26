import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { getDashboardData } from '@/lib/queries';

export async function POST(request) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const chatId = Number(body.chatId);
  const message = String(body.message || '').trim();

  if (!chatId || !message) {
    return NextResponse.json({ error: 'Chat and message are required.' }, { status: 400 });
  }

  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId: user.id } }
  });

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.message.create({
    data: {
      chatId,
      senderId: user.id,
      body: message
    }
  });

  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() }
  });

  const data = await getDashboardData(user.id);
  return NextResponse.json({ ok: true, data });
}
