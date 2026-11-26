import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {migrateAudience} from '../server/city-visibility.mjs';
const projectId=process.env.GCLOUD_PROJECT;if(!projectId)throw Error('Set GCLOUD_PROJECT explicitly');
initializeApp({projectId,...(process.env.FIRESTORE_EMULATOR_HOST?{}:{credential:applicationDefault()})});
const apply=process.argv.includes('--apply');
console.log(JSON.stringify(await migrateAudience(getFirestore(),{apply})));
