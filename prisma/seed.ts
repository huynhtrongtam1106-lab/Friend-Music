import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
console.log('🌱 Đang khởi tạo dữ liệu mẫu cho Friend Music...');

// 1. Tạo tài khoản Admin mặc định
const adminUser = await prisma.user.upsert({
where: { email: 'admin@friendmusic.vn' },
update: {},
create: {
email: 'admin@friendmusic.vn',
name: 'Quản Trị Viên Trung Tâm',
role: 'ADMIN',
phone: '0901234567',
},
});

// 2. Tạo Bảng giá các môn theo chuẩn file cũ
const plans = [
{ subject: 'Piano', packageName: 'Lớp cá nhân 4 buổi', sessions: 4, price: 1200000 },
{ subject: 'Piano', packageName: 'Lớp cá nhân 8 buổi', sessions: 8, price: 2200000 },
{ subject: 'Guitar', packageName: 'Lớp cá nhân 4 buổi', sessions: 4, price: 1000000 },
{ subject: 'Guitar', packageName: 'Lớp cá nhân 8 buổi', sessions: 8, price: 1800000 },
{ subject: 'Drum', packageName: 'Lớp cá nhân 4 buổi', sessions: 4, price: 1200000 },
{ subject: 'Drum', packageName: 'Lớp cá nhân 8 buổi', sessions: 8, price: 2200000 },
{ subject: 'Thanh Nhạc', packageName: 'Lớp cá nhân 4 buổi', sessions: 4, price: 1400000 },
];

for (const p of plans) {
await prisma.pricingPlan.upsert({
where: {
subject_packageName: { subject: p.subject, packageName: p.packageName },
},
update: { price: p.price, numberOfSessions: p.sessions },
create: {
subject: p.subject,
packageName: p.packageName,
numberOfSessions: p.sessions,
price: p.price,
},
});
}

// 3. Tạo mẫu 1 Giáo viên (Cô Mai Anh - Piano)
const teacherUser = await prisma.user.upsert({
where: { email: 'maianh.piano@friendmusic.vn' },
update: {},
create: {
email: 'maianh.piano@friendmusic.vn',
name: 'Cô Mai Anh',
role: 'TEACHER',
phone: '0912345678',
},
});

await prisma.teacher.upsert({
where: { userId: teacherUser.id },
update: {},
create: {
userId: teacherUser.id,
specializations: ['Piano'],
},
});

console.log('✅ Đã nạp thành công Admin, Bảng giá và Giáo viên vào Supabase!');
}

main()
.catch((e) => {
console.error('❌ Lỗi khi seed:', e);
process.exit(1);
})
.finally(async () => {
await prisma.$disconnect();
});