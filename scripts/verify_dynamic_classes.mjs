import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teusoseewbjzeniqomzu.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldXNvc2Vld2JqemVuaXFvbXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3NjY3NCwiZXhwIjoyMTA0NDUyNjc0fQ.mfHleNixrhwTNccWsqZ98YkQAIO5mFFtZm-KyNQGzOI';

const schoolId = '11111111-1111-1111-1111-111111111111';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runVerification() {
  console.log('=== Starting Dynamic Student Classes Automated Verification ===\n');

  // Test dynamic class names
  const dynamicClassA = 'Grade 11 - Cyber Science';
  const dynamicClassB = 'Grade 11 - Robotics Arts';

  // 0. Clean up any previous test rows
  await supabase
    .from('students')
    .delete()
    .eq('school_id', schoolId)
    .in('class', [dynamicClassA, dynamicClassB]);

  // Step 1: Query unique classes before insertion
  console.log('--- Step 1: Extracting Unique Classes from Database ---');
  const { data: studentRows, error: sErr } = await supabase
    .from('students')
    .select('class')
    .eq('school_id', schoolId)
    .not('class', 'is', null)
    .order('class', { ascending: true });

  if (sErr) {
    console.error('✗ Failed to query student classes:', sErr);
    process.exit(1);
  }

  const { data: academicRows, error: aErr } = await supabase
    .from('academic_classes')
    .select('name')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });

  const rawClasses = [
    ...((studentRows || []).map((r) => r.class)),
    ...((academicRows || []).map((r) => r.name)),
  ].filter(Boolean);

  const initialUniqueClasses = Array.from(new Set(rawClasses.map((c) => c.trim()))).sort();
  console.log(`✓ Initial unique classes extracted (${initialUniqueClasses.length}):`, initialUniqueClasses);

  // Step 2: Insert student with on-the-fly dynamic class
  console.log(`\n--- Step 2: Enrolling Student in Brand New Dynamic Class: "${dynamicClassA}" ---`);
  const student1 = {
    school_id: schoolId,
    class: dynamicClassA,
    name: 'Dynamic Pioneer One',
    roll_number: 1,
    parent_whatsapp: '919876543210',
  };

  const { data: s1, error: s1Err } = await supabase
    .from('students')
    .insert([student1])
    .select()
    .single();

  if (s1Err) {
    console.error(`✗ Failed to enroll student in dynamic class "${dynamicClassA}":`, s1Err);
    process.exit(1);
  }
  console.log(`✓ Enrolled: "${s1.name}" (Roll: ${s1.roll_number}, Class: "${s1.class}", ID: ${s1.id})`);

  // Step 3: Insert second student in same dynamic class
  console.log(`\n--- Step 3: Enrolling Second Student in Same Dynamic Class: "${dynamicClassA}" ---`);
  const student2 = {
    school_id: schoolId,
    class: dynamicClassA,
    name: 'Dynamic Pioneer Two',
    roll_number: 2,
    parent_whatsapp: '919876543211',
  };

  const { data: s2, error: s2Err } = await supabase
    .from('students')
    .insert([student2])
    .select()
    .single();

  if (s2Err) {
    console.error(`✗ Failed to enroll second student in dynamic class:`, s2Err);
    process.exit(1);
  }
  console.log(`✓ Enrolled: "${s2.name}" (Roll: ${s2.roll_number}, Class: "${s2.class}", ID: ${s2.id})`);

  // Step 4: Test duplicate roll number rejection in same dynamic class
  console.log(`\n--- Step 4: Testing Duplicate Roll Number Constraint in "${dynamicClassA}" ---`);
  const dupStudent = {
    school_id: schoolId,
    class: dynamicClassA,
    name: 'Duplicate Roll Impostor',
    roll_number: 1, // Same roll 1 in dynamicClassA
    parent_whatsapp: '919876543212',
  };

  const { data: sDup, error: dupErr } = await supabase
    .from('students')
    .insert([dupStudent])
    .select()
    .single();

  if (dupErr) {
    console.log(`✓ Correctly rejected duplicate roll number!`);
    console.log(`   Code: ${dupErr.code}, Message: ${dupErr.message}`);
  } else {
    console.error('✗ Failed! Database allowed duplicate roll in dynamic class:', sDup);
    process.exit(1);
  }

  // Step 5: Test same roll number in a different dynamic class (must succeed)
  console.log(`\n--- Step 5: Testing Same Roll Number (1) in Different Dynamic Class: "${dynamicClassB}" ---`);
  const diffClassStudent = {
    school_id: schoolId,
    class: dynamicClassB,
    name: 'Robotics Student One',
    roll_number: 1, // Roll 1 in dynamicClassB
    parent_whatsapp: '919876543213',
  };

  const { data: sDiff, error: diffErr } = await supabase
    .from('students')
    .insert([diffClassStudent])
    .select()
    .single();

  if (diffErr) {
    console.error(`✗ Failed to allow roll 1 in different dynamic class:`, diffErr);
    process.exit(1);
  }
  console.log(`✓ Successfully allowed roll 1 in "${sDiff.class}": ID ${sDiff.id}`);

  // Step 6: Verify newly created dynamic classes appear in unique classes query
  console.log('\n--- Step 6: Verifying Unique Dynamic Classes Query Update ---');
  const { data: updatedStudentRows } = await supabase
    .from('students')
    .select('class')
    .eq('school_id', schoolId)
    .not('class', 'is', null)
    .order('class', { ascending: true });

  const updatedRawClasses = [
    ...((updatedStudentRows || []).map((r) => r.class)),
    ...((academicRows || []).map((r) => r.name)),
  ].filter(Boolean);

  const updatedUniqueClasses = Array.from(new Set(updatedRawClasses.map((c) => c.trim()))).sort();
  console.log(`✓ Updated unique classes extracted (${updatedUniqueClasses.length}):`, updatedUniqueClasses);

  if (!updatedUniqueClasses.includes(dynamicClassA) || !updatedUniqueClasses.includes(dynamicClassB)) {
    console.error('✗ Dynamic classes missing from updated unique classes list!');
    process.exit(1);
  }
  console.log(`✓ Both "${dynamicClassA}" and "${dynamicClassB}" appear in the unique classes list!`);

  // Step 7: Clean up test students
  console.log('\n--- Step 7: Cleaning up Test Records ---');
  await supabase
    .from('students')
    .delete()
    .eq('school_id', schoolId)
    .in('id', [s1.id, s2.id, sDiff.id]);
  console.log('✓ Cleaned up test records.');

  console.log('\n================================================================');
  console.log('🎉 ALL DYNAMIC ON-THE-FLY CLASS TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
