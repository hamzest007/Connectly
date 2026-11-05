import bcrypt from 'bcryptjs';
import {connectDatabase} from './config/database';
import {User} from './modules/auth/auth.model';
import {Post} from './modules/posts/post.model';

async function seed() {
  await connectDatabase();
  await Promise.all([User.deleteMany({}), Post.deleteMany({})]);
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) throw new Error('Set SEED_ADMIN_PASSWORD to a unique password of at least 12 characters before seeding.');
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  await User.create({name: 'Connectly Administrator', username: 'connectlyadmin', normalizedUsername: 'connectlyadmin', email: 'admin@connectly.local', normalizedEmail: 'admin@connectly.local', passwordHash, avatarUrl: '', role:'admin', bio: '', acceptedTermsAt: new Date(), acceptedTermsVersion: '2026-01'});
  console.log('Seed complete. Admin account created. Use the configured seed password.');
  process.exit(0);
}

seed().catch(error => {console.error(error); process.exit(1);});
