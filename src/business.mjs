// Business type is independent of the account's authorization role.
export const businessType = shop => shop?.businessType || 'parts_shop';
export function submissionState(type) {
  if (!['parts_shop','auto_service'].includes(type)) throw Error('ბიზნესის ტიპი არასწორია');
  return type === 'auto_service' ? 'pending_approval' : 'pending';
}
export function reviewFields(actor, status, reason, timestamp) {
  if (actor.role !== 'superadmin') throw Error('მხოლოდ სუპერადმინს შეუძლია ავტოსერვისის განხილვა');
  if (!['approved','rejected','needs_clarification','suspended'].includes(status)) throw Error('სტატუსი არასწორია');
  const reviewReason = String(reason || '').trim();
  if (reviewReason.length > 1000 || (status !== 'approved' && !reviewReason)) throw Error('მიუთითე მიზეზი (მაქს. 1000 სიმბოლო)');
  return {status,reviewReason:status === 'approved' ? '' : reviewReason,reviewedBy:actor.id,reviewedAt:timestamp};
}
export function legacyBusinessPatch(data) {
  return Object.hasOwn(data,'businessType') ? null : {businessType:'parts_shop'};
}
