import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teusoseewbjzeniqomzu.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldXNvc2Vld2JqemVuaXFvbXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3NjY3NCwiZXhwIjoyMTA0NDUyNjc0fQ.mfHleNixrhwTNccWsqZ98YkQAIO5mFFtZm-KyNQGzOI';

const schoolId = 'bd7deda8-8e05-4fb5-b823-b41586cd3cb4'; // S S Academy (suraj)
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyFixes() {
  console.log('=== Starting Faculty Allocation Verification for Tenant S S Academy ===');

  // 1. Fetch available staff faculty under school_id
  const { data: staffList, error: sErr } = await supabase
    .from('profiles')
    .select('id, name, email, role, school_id')
    .eq('role', 'staff')
    .eq('school_id', schoolId);

  if (sErr) throw sErr;
  console.log(`✓ Retrieved ${staffList.length} staff members for school ${schoolId}:`);
  for (const s of staffList) {
    console.log(`  - ${s.name} (${s.email}) [ID: ${s.id}]`);
  }

  if (staffList.length === 0) {
    throw new Error('No staff members found for school!');
  }

  const teacher = staffList[0];

  // 2. Fetch subject "maths" under S S Academy
  const { data: subjects, error: subErr } = await supabase
    .from('academic_subjects')
    .select('id, name, class_id, school_id')
    .eq('school_id', schoolId)
    .eq('name', 'maths');

  if (subErr) throw subErr;
  if (!subjects || subjects.length === 0) {
    throw new Error('Subject "maths" not found for school!');
  }
  const targetSubject = subjects[0];
  console.log(`✓ Found target subject: "${targetSubject.name}" (ID: ${targetSubject.id})`);

  // 3. Test Mutation: Clean up any prior allocation
  const { error: delErr } = await supabase
    .from('teacher_allocations')
    .delete()
    .eq('subject_id', targetSubject.id);

  if (delErr) throw delErr;

  // 4. Test Mutation: Insert teacher_allocation mapping school_id, teacher_id, staff_id, subject_id, class_id
  const { data: newAlloc, error: insErr } = await supabase
    .from('teacher_allocations')
    .insert([
      {
        school_id: schoolId,
        teacher_id: teacher.id,
        staff_id: teacher.id,
        subject_id: targetSubject.id,
        class_id: targetSubject.class_id,
        is_class_teacher: false,
      },
    ])
    .select()
    .single();

  if (insErr) throw insErr;
  console.log(`✓ Successfully created teacher_allocation record:`);
  console.log(`  Allocation ID: ${newAlloc.id}`);
  console.log(`  School ID:     ${newAlloc.school_id}`);
  console.log(`  Teacher ID:    ${newAlloc.teacher_id}`);
  console.log(`  Subject ID:    ${newAlloc.subject_id}`);
  console.log(`  Class ID:      ${newAlloc.class_id}`);

  // 5. Verify allocation retrieval
  const { data: verifyAlloc, error: vErr } = await supabase
    .from('teacher_allocations')
    .select('*, profiles:teacher_id(name, email), academic_subjects(name)')
    .eq('id', newAlloc.id)
    .single();

  if (vErr) throw vErr;
  console.log(`✓ Verified allocation join: ${verifyAlloc.profiles?.name} assigned to ${verifyAlloc.academic_subjects?.name}`);

  console.log('=== All Faculty Allocation Verification Checks Passed! ===');
}

verifyFixes().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
