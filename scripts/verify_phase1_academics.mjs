import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teusoseewbjzeniqomzu.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldXNvc2Vld2JqemVuaXFvbXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3NjY3NCwiZXhwIjoyMTA0NDUyNjc0fQ.mfHleNixrhwTNccWsqZ98YkQAIO5mFFtZm-KyNQGzOI';

const schoolId = '11111111-1111-1111-1111-111111111111';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runVerification() {
  console.log('=== Starting Phase 1 Academics Automated Verification ===');

  // 1. Verify Classes
  const { data: classes, error: cErr } = await supabase
    .from('academic_classes')
    .select('*')
    .eq('school_id', schoolId);
  if (cErr) throw cErr;
  console.log(`✓ Retrieved ${classes.length} classes for tenant ${schoolId}`);

  // 2. Verify or Create "Class 8"
  let class8 = classes.find((c) => c.name === 'Class 8');
  if (!class8) {
    const { data: newC, error: insCErr } = await supabase
      .from('academic_classes')
      .insert([{ school_id: schoolId, name: 'Class 8' }])
      .select()
      .single();
    if (insCErr) throw insCErr;
    class8 = newC;
    console.log(`✓ Created new class: "${class8.name}" (ID: ${class8.id})`);
  } else {
    console.log(`✓ Found existing class: "${class8.name}" (ID: ${class8.id})`);
  }

  // 3. Verify or Create Subject "Social Studies" under Class 8
  const { data: existingSubs } = await supabase
    .from('academic_subjects')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_id', class8.id)
    .eq('name', 'Social Studies');

  let subjectSocial = existingSubs?.[0];
  if (!subjectSocial) {
    const { data: newSub, error: subErr } = await supabase
      .from('academic_subjects')
      .insert([{ school_id: schoolId, class_id: class8.id, name: 'Social Studies' }])
      .select()
      .single();
    if (subErr) throw subErr;
    subjectSocial = newSub;
    console.log(`✓ Created subject: "${subjectSocial.name}" under ${class8.name}`);
  } else {
    console.log(`✓ Found existing subject: "${subjectSocial.name}" under ${class8.name}`);
  }

  // 4. Add Chapters in Term 1 and Term 2
  const { data: existingChaps } = await supabase
    .from('chapters')
    .select('*')
    .eq('school_id', schoolId)
    .eq('subject_id', subjectSocial.id);

  let chapTerm1 = existingChaps?.find((c) => c.name === 'Indian Constitution');
  if (!chapTerm1) {
    const { data: newChap, error: chErr } = await supabase
      .from('chapters')
      .insert([
        {
          school_id: schoolId,
          subject_id: subjectSocial.id,
          name: 'Indian Constitution',
          term: 'Term 1',
          order_index: 1,
        },
      ])
      .select()
      .single();
    if (chErr) throw chErr;
    chapTerm1 = newChap;
    console.log(`✓ Added chapter to Term 1: "${chapTerm1.name}"`);
  } else {
    console.log(`✓ Found Term 1 chapter: "${chapTerm1.name}"`);
  }

  let chapTerm2 = existingChaps?.find((c) => c.name === 'Global Economics');
  if (!chapTerm2) {
    const { data: newChap2, error: chErr2 } = await supabase
      .from('chapters')
      .insert([
        {
          school_id: schoolId,
          subject_id: subjectSocial.id,
          name: 'Global Economics',
          term: 'Term 2',
          order_index: 1,
        },
      ])
      .select()
      .single();
    if (chErr2) throw chErr2;
    chapTerm2 = newChap2;
    console.log(`✓ Added chapter to Term 2: "${chapTerm2.name}"`);
  } else {
    console.log(`✓ Found Term 2 chapter: "${chapTerm2.name}"`);
  }

  // 5. Test Faculty Allocation
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('school_id', schoolId)
    .eq('role', 'staff')
    .limit(2);

  if (staffList && staffList.length > 0) {
    const targetTeacher = staffList[0];
    // Remove old allocation if any
    await supabase
      .from('teacher_allocations')
      .delete()
      .eq('subject_id', subjectSocial.id);

    // Insert allocation
    const { data: newAlloc, error: allocErr } = await supabase
      .from('teacher_allocations')
      .insert([
        {
          school_id: schoolId,
          subject_id: subjectSocial.id,
          teacher_id: targetTeacher.id,
          staff_id: targetTeacher.id,
        },
      ])
      .select()
      .single();
    if (allocErr) throw allocErr;
    console.log(
      `✓ Successfully allocated ${targetTeacher.name} (${targetTeacher.email}) to "${subjectSocial.name}" (Allocation ID: ${newAlloc.id})`
    );
  }

  // 6. Test Cascade Deletion Constraint
  // Create a temporary test subject and chapters to verify cascading deletes work cleanly
  const { data: tempSub, error: tempSubErr } = await supabase
    .from('academic_subjects')
    .insert([{ school_id: schoolId, class_id: class8.id, name: 'Temp Cascade Test Subject' }])
    .select()
    .single();
  if (tempSubErr) throw tempSubErr;

  const { data: tempChap, error: tempChapErr } = await supabase
    .from('chapters')
    .insert([
      {
        school_id: schoolId,
        subject_id: tempSub.id,
        name: 'Temp Chapter 1',
        term: 'Term 1',
        order_index: 1,
      },
    ])
    .select()
    .single();
  if (tempChapErr) throw tempChapErr;

  // Now delete the parent subject
  const { error: delErr } = await supabase
    .from('academic_subjects')
    .delete()
    .eq('id', tempSub.id);
  if (delErr) throw delErr;

  // Verify the child chapter was cascaded and no longer exists
  const { data: verifyChap } = await supabase
    .from('chapters')
    .select('id')
    .eq('id', tempChap.id);

  if (verifyChap && verifyChap.length === 0) {
    console.log('✓ ON DELETE CASCADE verified: Deleting subject cleanly removed child chapters.');
  } else {
    throw new Error('Cascade delete failed: Orphaned chapter still exists!');
  }

  console.log('=== All Phase 1 Database & Architecture Verifications Passed! ===');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
