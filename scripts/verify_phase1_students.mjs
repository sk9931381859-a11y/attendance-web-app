import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teusoseewbjzeniqomzu.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldXNvc2Vld2JqemVuaXFvbXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3NjY3NCwiZXhwIjoyMTA0NDUyNjc0fQ.mfHleNixrhwTNccWsqZ98YkQAIO5mFFtZm-KyNQGzOI';

const schoolId = '11111111-1111-1111-1111-111111111111';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runVerification() {
  console.log('=== Starting Phase 1 Student Attendance System Automated Verification ===\n');

  // 1. Fetch available classes for tenant
  const { data: classes, error: cErr } = await supabase
    .from('academic_classes')
    .select('id, name, school_id')
    .eq('school_id', schoolId)
    .order('name');

  if (cErr) {
    console.error('✗ Failed to fetch academic classes:', cErr);
    process.exit(1);
  }
  console.log(`✓ Retrieved ${classes.length} classes for school ${schoolId}:`);
  classes.forEach((c) => console.log(`   - [${c.id}] ${c.name}`));

  if (classes.length < 2) {
    console.error('✗ Need at least 2 classes to test cross-class roll number uniqueness.');
    process.exit(1);
  }

  const classA = classes[0];
  const classB = classes[1];

  // 2. Clean up any previous test students with roll 999 or 998
  await supabase
    .from('students')
    .delete()
    .eq('school_id', schoolId)
    .in('roll_number', [998, 999]);

  console.log('\n--- Step 1: Enrolling Test Student 1 in Class A ---');
  const testStudent1 = {
    school_id: schoolId,
    class_id: classA.id,
    name: 'Test Student Alpha',
    roll_number: 999,
    parent_whatsapp: '919876543210',
  };

  const { data: s1, error: s1Err } = await supabase
    .from('students')
    .insert([testStudent1])
    .select()
    .single();

  if (s1Err) {
    console.error('✗ Failed to enroll test student 1:', s1Err);
    process.exit(1);
  }
  console.log(`✓ Student 1 enrolled: "${s1.name}" (Roll: ${s1.roll_number}, Class: ${classA.name}, ID: ${s1.id})`);

  console.log('\n--- Step 2: Testing Unique Roll Number Constraint in Same Class ---');
  const duplicateRollStudent = {
    school_id: schoolId,
    class_id: classA.id,
    name: 'Duplicate Roll Impostor',
    roll_number: 999, // Same roll number in classA
    parent_whatsapp: '919123456789',
  };

  const { data: sDup, error: dupErr } = await supabase
    .from('students')
    .insert([duplicateRollStudent])
    .select()
    .single();

  if (dupErr) {
    console.log(`✓ Correctly rejected duplicate roll number!`);
    console.log(`   Error Code: ${dupErr.code}`);
    console.log(`   Message: ${dupErr.message}`);
    if (dupErr.code !== '23505') {
      console.warn('   Note: Expected error code 23505 (unique violation).');
    }
  } else {
    console.error('✗ Failed! Database allowed duplicate roll number in same class:', sDup);
    process.exit(1);
  }

  console.log('\n--- Step 3: Testing Same Roll Number in a Different Class (Must Succeed) ---');
  const differentClassStudent = {
    school_id: schoolId,
    class_id: classB.id,
    name: 'Test Student Beta (Class B)',
    roll_number: 999, // Same roll, but in classB
    parent_whatsapp: '919988776655',
  };

  const { data: sDiff, error: diffErr } = await supabase
    .from('students')
    .insert([differentClassStudent])
    .select()
    .single();

  if (diffErr) {
    console.error('✗ Failed to allow same roll number in different class:', diffErr);
    process.exit(1);
  }
  console.log(`✓ Successfully allowed roll 999 in ${classB.name}: ID ${sDiff.id}`);

  console.log('\n--- Step 4: Testing Student Attendance Insertion & Daily Unique Constraint ---');
  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceRecord = {
    school_id: schoolId,
    student_id: s1.id,
    date: todayStr,
    status: 'PRESENT',
    whatsapp_sent: false,
  };

  const { data: att1, error: attErr } = await supabase
    .from('student_attendance')
    .insert([attendanceRecord])
    .select()
    .single();

  if (attErr) {
    console.error('✗ Failed to insert student attendance:', attErr);
    process.exit(1);
  }
  console.log(`✓ Inserted attendance: Student ${att1.student_id}, Date ${att1.date}, Status: ${att1.status}`);

  // Duplicate date test for same student
  const { data: attDup, error: attDupErr } = await supabase
    .from('student_attendance')
    .insert([attendanceRecord])
    .select()
    .single();

  if (attDupErr) {
    console.log(`✓ Correctly rejected duplicate daily attendance for student!`);
    console.log(`   Error Code: ${attDupErr.code}`);
    console.log(`   Message: ${attDupErr.message}`);
  } else {
    console.error('✗ Failed! Duplicate daily attendance record allowed:', attDup);
    process.exit(1);
  }

  console.log('\n--- Step 5: Seeding Realistic Student Directory Records if Empty ---');
  // Check if students already exist for classA
  const { data: existingClassStudents } = await supabase
    .from('students')
    .select('id, name, roll_number')
    .eq('class_id', classA.id);

  const nonTestCount = existingClassStudents.filter((s) => s.roll_number < 900).length;
  if (nonTestCount === 0) {
    console.log(`Seeding sample students for ${classA.name}...`);
    const seedStudents = [
      {
        school_id: schoolId,
        class_id: classA.id,
        name: 'Aarav Patel',
        roll_number: 1,
        parent_whatsapp: '919820012345',
      },
      {
        school_id: schoolId,
        class_id: classA.id,
        name: 'Diya Sharma',
        roll_number: 2,
        parent_whatsapp: '919820054321',
      },
      {
        school_id: schoolId,
        class_id: classA.id,
        name: 'Rohan Gupta',
        roll_number: 3,
        parent_whatsapp: '919820098765',
      },
      {
        school_id: schoolId,
        class_id: classA.id,
        name: 'Ananya Verma',
        roll_number: 4,
        parent_whatsapp: '919820033445',
      },
    ];

    for (const st of seedStudents) {
      const { error: insErr } = await supabase.from('students').insert([st]);
      if (!insErr) {
        console.log(`   ✓ Seeded: Roll ${st.roll_number} - ${st.name}`);
      }
    }
  } else {
    console.log(`✓ Class ${classA.name} already has ${nonTestCount} enrolled students.`);
  }

  // Clean up test rows
  console.log('\n--- Cleaning up temporary test rows (rolls 998, 999) ---');
  await supabase.from('student_attendance').delete().eq('student_id', s1.id);
  await supabase.from('students').delete().in('id', [s1.id, sDiff.id]);
  console.log('✓ Cleaned up test records.');

  console.log('\n================================================================');
  console.log('🎉 ALL PHASE 1 DATABASE SCHEMA & CONSTRAINT TESTS PASSED!');
  console.log('================================================================\n');
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
