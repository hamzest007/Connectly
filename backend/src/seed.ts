import bcrypt from 'bcryptjs';
import {connectDatabase} from './config/database';
import {User} from './modules/auth/auth.model';
import {Post} from './modules/posts/post.model';

async function seed() {
  await connectDatabase();
  await Promise.all([User.deleteMany({}), Post.deleteMany({})]);
  const passwordHash = await bcrypt.hash('Connectly123!', 12);
  await User.create({name: 'Connectly Administrator', username: 'connectlyadmin', email: 'admin@connectly.local', passwordHash, avatarUrl: '', role:'admin', bio: 'Platform administration account.'});
  console.log('Seed complete. Admin account created.');
  process.exit(0);
}

seed().catch(error => {console.error(error); process.exit(1);});
