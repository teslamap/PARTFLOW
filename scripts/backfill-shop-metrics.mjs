import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {backfillShopMetrics} from '../functions/shop-metrics.mjs';
const projectId=process.env.GCLOUD_PROJECT;if(!projectId)throw Error('Set GCLOUD_PROJECT explicitly');
initializeApp({projectId,...(process.env.FIRESTORE_EMULATOR_HOST?{}:{credential:applicationDefault()})});
console.log(JSON.stringify(await backfillShopMetrics(getFirestore(),{apply:process.argv.includes('--apply')})));
