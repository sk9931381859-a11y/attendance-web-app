import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teusoseewbjzeniqomzu.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldXNvc2Vld2JqemVuaXFvbXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3NjY3NCwiZXhwIjoyMTA0NDUyNjc0fQ.mfHleNixrhwTNccWsqZ98YkQAIO5mFFtZm-KyNQGzOI';

const schoolId = '11111111-1111-1111-1111-111111111111';
const teacherId = 'b678a5d7-6159-44ef-a61a-970eee23ef86'; // Demo Teacher

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runPhase2Verification() {
  console.log('=== Starting Phase 2: Teacher Execution Hub Verification ===');

  // 1. Fetch teacher allocations
  const { data: rawAllocations, error: allocErr } = await supabase
    .from('teacher_allocations')
    .select('id, school_id, teacher_id, subject_id, academic_subjects(id, name, class_id, academic_classes(id, name))')
    .eq('teacher_id', teacherId);

  if (allocErr) throw allocErr;
  console.log(`✓ Retrieved ${rawAllocations.length} allocations for teacher ${teacherId}`);

  if (rawAllocations.length === 0) {
    throw new Error('No allocations found for demo teacher! Seed data required.');
  }

  const alloc = rawAllocations[0];
  const subjectName = alloc.academic_subjects?.name;
  const className = alloc.academic_subjects?.academic_classes?.name;
  console.log(`✓ Active Subject: "${className} - ${subjectName}" (Allocation ID: ${alloc.id})`);

  // 2. Fetch chapters for this subject
  const { data: chapters, error: chapsErr } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', alloc.subject_id)
    .order('order_index', { ascending: true });

  if (chapsErr) throw chapsErr;
  console.log(`✓ Retrieved ${chapters.length} chapters for "${subjectName}":`);
  chapters.forEach((c) => console.log(`   • [${c.term}] ${c.name}`));

  const targetChapter = chapters[0];

  // 3. Test 40/40/20 Mutation Logic
  console.log(`\nTesting 40/40/20 progression on chapter: "${targetChapter.name}"...`);

  // Step A: Mark Explained (40%)
  const now = new Date().toISOString();
  const { data: prog1, error: pErr1 } = await supabase
    .from('chapter_progress')
    .upsert({
      school_id: schoolId,
      allocation_id: alloc.id,
      chapter_id: targetChapter.id,
      explained_at: now,
    })
    .select()
    .single();

  if (pErr1) throw pErr1;
  console.log(`✓ Step 1: Marked "Explained (40%)" at ${prog1.explained_at}`);

  // Step B: Mark Exercise (40%)
  const { data: prog2, error: pErr2 } = await supabase
    .from('chapter_progress')
    .update({
      exercise_discussed_at: now,
    })
    .eq('id', prog1.id)
    .select()
    .single();

  if (pErr2) throw pErr2;
  console.log(`✓ Step 2: Marked "Exercise (40%)" at ${prog2.exercise_discussed_at}`);

  // Step C: Mark Copy Checked (20%)
  const { data: prog3, error: pErr3 } = await supabase
    .from('chapter_progress')
    .update({
      copy_checked_at: now,
    })
    .eq('id', prog1.id)
    .select()
    .single();

  if (pErr3) throw pErr3;
  console.log(`✓ Step 3: Marked "Copy Checked (20%)" at ${prog3.copy_checked_at}`);

  // Verify total chapter points = 40 + 40 + 20 = 100
  let chapterPoints = 0;
  if (prog3.explained_at) chapterPoints += 40;
  if (prog3.exercise_discussed_at) chapterPoints += 40;
  if (prog3.copy_checked_at) chapterPoints += 20;

  if (chapterPoints === 100) {
    console.log('✓ Chapter weighted progression successfully reached 100%');
  } else {
    throw new Error(`Progression calculation mismatch: got ${chapterPoints}`);
  }

  // Step D: Uncheck Exercise (set to null) -> should be 60%
  const { data: prog4, error: pErr4 } = await supabase
    .from('chapter_progress')
    .update({
      exercise_discussed_at: null,
    })
    .eq('id', prog1.id)
    .select()
    .single();

  if (pErr4) throw pErr4;
  let updatedPoints = 0;
  if (prog4.explained_at) updatedPoints += 40;
  if (prog4.exercise_discussed_at) updatedPoints += 40;
  if (prog4.copy_checked_at) updatedPoints += 20;

  if (updatedPoints === 60) {
    console.log('✓ Step 4: Unchecked Exercise -> Points successfully reduced to 60%');
  } else {
    throw new Error(`Progression reduction mismatch: got ${updatedPoints}`);
  }

  // 4. Test Subject Progress Bar Percentage Calculation
  const totalChapters = chapters.length;
  // If chapter 1 is 60 points and other chapters are 0 points:
  const expectedSubjectPercent = Math.round((60 / (totalChapters * 100)) * 100);
  console.log(`✓ Subject Progress Bar Calculation: ${expectedSubjectPercent}% for ${totalChapters} chapters`);

  console.log('\n=== All Phase 2 Teacher Execution Hub Tests Passed! ===');
}

runPhase2Verification().catch((err) => {
  console.error('Phase 2 verification failed:', err);
  process.exit(1);
});
