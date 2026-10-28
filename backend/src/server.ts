import {app} from './app';
import {env} from './config/env';
import {connectDatabase} from './config/database';

connectDatabase().then(() => app.listen(env.port, () => console.log(`Connectly API listening on port ${env.port}`))).catch(error => { console.error('Database connection failed', error); process.exit(1); });
