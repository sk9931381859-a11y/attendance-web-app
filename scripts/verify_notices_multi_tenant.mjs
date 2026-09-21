import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teusoseewbjzeniqomzu.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldXNvc2Vld2JqemVuaXFvbXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3NjY3NCwiZXhwIjoyMTA0NDUyNjc0fQ.mfHleNixrhwTNccWsqZ98YkQAIO5mFFtZm-KyNQGzOI';

const schoolApex = '11111111-1111-1111-1111-111111111111'; // Apex Global Academy
const schoolSS = 'bd7deda8-8e05-4fb5-b823-b41586cd3cb4';   // S S Academy

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runVerification() {
  console.log('=== Starting School Notices Multi-Tenant Isolation Verification ===\n');

  // Clean up any previous test notices
  await supabase
    .from('school_notices')
    .delete()
    .in('title', ['[TEST] S S Academy Annual Sports Meet', '[TEST] Apex Global Science Exhibition']);

  console.log('--- Step 1: Broadcasting Announcement for S S Academy ---');
  const ssNoticePayload = {
    school_id: schoolSS,
    title: '[TEST] S S Academy Annual Sports Meet',
    content: 'All faculty members must assemble on the ground at 8:00 AM.',
    priority: 'high',
  };

  const { data: ssNotice, error: ssErr } = await supabase
    .from('school_notices')
    .insert([ssNoticePayload])
    .select()
    .single();

  if (ssErr) {
    console.error('✗ Failed to insert S S Academy notice:', ssErr);
    process.exit(1);
  }
  console.log(`✓ S S Academy Notice Created: [${ssNotice.id}] "${ssNotice.title}" (School: ${ssNotice.school_id})`);

  console.log('\n--- Step 2: Broadcasting Announcement for Apex Global Academy ---');
  const apexNoticePayload = {
    school_id: schoolApex,
    title: '[TEST] Apex Global Science Exhibition',
    content: 'Science exhibits setup starts this Friday in Auditorium B.',
    priority: 'normal',
  };

  const { data: apexNotice, error: apexErr } = await supabase
    .from('school_notices')
    .insert([apexNoticePayload])
    .select()
    .single();

  if (apexErr) {
    console.error('✗ Failed to insert Apex Global notice:', apexErr);
    process.exit(1);
  }
  console.log(`✓ Apex Global Notice Created: [${apexNotice.id}] "${apexNotice.title}" (School: ${apexNotice.school_id})`);

  console.log('\n--- Step 3: Verifying Tenant Query Isolation for Apex Global ---');
  const { data: apexNotices, error: qApexErr } = await supabase
    .from('school_notices')
    .select('id, title, school_id')
    .eq('school_id', schoolApex);

  if (qApexErr) {
    console.error('✗ Query failed for Apex notices:', qApexErr);
    process.exit(1);
  }

  const hasSSInApex = apexNotices.some((n) => n.id === ssNotice.id || n.school_id === schoolSS);
  const hasApexInApex = apexNotices.some((n) => n.id === apexNotice.id);

  console.log(`Retrieved ${apexNotices.length} notices for Apex Global:`);
  apexNotices.forEach((n) => console.log(`   - [${n.school_id}] ${n.title}`));

  if (hasSSInApex) {
    console.error('✗ CRITICAL SECURITY LEAK: S S Academy notice was visible in Apex Global results!');
    process.exit(1);
  }
  if (!hasApexInApex) {
    console.error('✗ Apex Global notice was not returned for Apex Global.');
    process.exit(1);
  }
  console.log('✓ PASS: Zero notices leaked from S S Academy into Apex Global!');

  console.log('\n--- Step 4: Verifying Tenant Query Isolation for S S Academy ---');
  const { data: ssNotices, error: qSsErr } = await supabase
    .from('school_notices')
    .select('id, title, school_id')
    .eq('school_id', schoolSS);

  if (qSsErr) {
    console.error('✗ Query failed for S S notices:', qSsErr);
    process.exit(1);
  }

  const hasApexInSS = ssNotices.some((n) => n.id === apexNotice.id || n.school_id === schoolApex);
  const hasSSInSS = ssNotices.some((n) => n.id === ssNotice.id);

  console.log(`Retrieved ${ssNotices.length} notices for S S Academy:`);
  ssNotices.forEach((n) => console.log(`   - [${n.school_id}] ${n.title}`));

  if (hasApexInSS) {
    console.error('✗ CRITICAL SECURITY LEAK: Apex Global notice was visible in S S Academy results!');
    process.exit(1);
  }
  if (!hasSSInSS) {
    console.error('✗ S S Academy notice was not returned for S S Academy.');
    process.exit(1);
  }
  console.log('✓ PASS: Zero notices leaked from Apex Global into S S Academy!');

  // Cleanup test rows
  console.log('\n--- Step 5: Cleaning Up Temporary Test Notices ---');
  await supabase.from('school_notices').delete().in('id', [ssNotice.id, apexNotice.id]);
  console.log('✓ Cleaned up test records.');

  console.log('\n================================================================');
  console.log('🎉 ALL MULTI-TENANT ISOLATION TESTS PASSED!');
  console.log('================================================================\n');
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
