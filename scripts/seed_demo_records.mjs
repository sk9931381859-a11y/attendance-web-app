import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://teusoseewbjzeniqomzu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldXNvc2Vld2JqemVuaXFvbXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3NjY3NCwiZXhwIjoyMTA0NDUyNjc0fQ.mfHleNixrhwTNccWsqZ98YkQAIO5mFFtZm-KyNQGzOI'
);

const schoolId = '11111111-1111-1111-1111-111111111111';

async function seed() {
  console.log('--- Starting Demo Data Seed ---');

  // 1. Check Profiles
  const { data: profs } = await supabase.from('profiles').select('id, email, name');
  console.log('Current profiles count:', profs?.length);

  const demoStaff = [
    { name: 'Dr. Evelyn Reed', email: 'evelyn.reed@attendance.app', designation: 'Senior Physics Faculty', shift_start_time: '08:00:00', salary: 65000, role: 'staff', school_id: schoolId, company_id: schoolId },
    { name: 'Marcus Vance', email: 'marcus.vance@attendance.app', designation: 'Head of Mathematics', shift_start_time: '08:00:00', salary: 72000, role: 'staff', school_id: schoolId, company_id: schoolId },
    { name: 'Sarah Jenkins', email: 'sarah.jenkins@attendance.app', designation: 'English Literature Faculty', shift_start_time: '08:30:00', salary: 58000, role: 'staff', school_id: schoolId, company_id: schoolId },
    { name: 'Prof. David Chen', email: 'david.chen@attendance.app', designation: 'Chemistry Department Lead', shift_start_time: '08:00:00', salary: 68000, role: 'staff', school_id: schoolId, company_id: schoolId },
    { name: 'Priya Sharma', email: 'priya.sharma@attendance.app', designation: 'Computer Science Instructor', shift_start_time: '08:30:00', salary: 60000, role: 'staff', school_id: schoolId, company_id: schoolId }
  ];

  for (const staff of demoStaff) {
    const existing = profs?.find(p => p.email === staff.email);
    if (!existing) {
      const { error: insErr } = await supabase.from('profiles').insert([staff]);
      if (insErr) console.error('Insert staff error:', insErr.message);
    }
  }

  const { data: allProfs } = await supabase.from('profiles').select('id, name, email, shift_start_time, designation').eq('school_id', schoolId);
  console.log('Total profiles now:', allProfs?.length);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // 2. Attendance Logs for Today
  const { data: existingLogs } = await supabase.from('attendance_logs').select('id').gte('created_at', dateStr + 'T00:00:00.000Z');
  console.log('Existing logs for today:', existingLogs?.length);

  if (!existingLogs || existingLogs.length === 0) {
    const teachers = allProfs?.filter(p => p.email !== 'buildwithsuraj001@gmail.com') || [];
    console.log('Target teachers for attendance logs:', teachers.length);

    if (teachers.length >= 4) {
      const logsToInsert = [
        {
          teacher_id: teachers[0].id,
          check_in_time: dateStr + 'T07:54:10.000Z',
          status: 'present',
          is_late: false,
          minutes_late: 0,
          school_id: schoolId,
          company_id: schoolId,
          created_at: dateStr + 'T07:54:10.000Z'
        },
        {
          teacher_id: teachers[1].id,
          check_in_time: dateStr + 'T07:58:25.000Z',
          status: 'present',
          is_late: false,
          minutes_late: 0,
          school_id: schoolId,
          company_id: schoolId,
          created_at: dateStr + 'T07:58:25.000Z'
        },
        {
          teacher_id: teachers[2].id,
          check_in_time: dateStr + 'T08:18:45.000Z',
          status: 'late',
          is_late: true,
          minutes_late: 18,
          school_id: schoolId,
          company_id: schoolId,
          created_at: dateStr + 'T08:18:45.000Z'
        },
        {
          teacher_id: teachers[3].id,
          check_in_time: dateStr + 'T08:24:12.000Z',
          status: 'late',
          is_late: true,
          minutes_late: 24,
          school_id: schoolId,
          company_id: schoolId,
          created_at: dateStr + 'T08:24:12.000Z'
        }
      ];

      const { error: logErr } = await supabase.from('attendance_logs').insert(logsToInsert);
      if (logErr) console.error('Insert attendance logs error:', logErr.message);
      else console.log('Successfully inserted 4 attendance logs for today.');
    }
  }

  // 3. Leave Requests
  const { data: existingLeaves } = await supabase.from('leave_requests').select('id');
  console.log('Existing leave requests:', existingLeaves?.length);

  if (!existingLeaves || existingLeaves.length === 0) {
    const teachers = allProfs?.filter(p => p.email !== 'buildwithsuraj001@gmail.com') || [];
    if (teachers.length >= 3) {
      const leavesToInsert = [
        {
          staff_id: teachers[1].id,
          start_date: dateStr,
          end_date: dateStr,
          leave_type: 'Sick Leave',
          reason: 'Severe acute migraine; doctor advised 24-hour bed rest.',
          status: 'pending',
          school_id: schoolId
        },
        {
          staff_id: teachers[2].id,
          start_date: dateStr,
          end_date: dateStr,
          leave_type: 'Casual Leave',
          reason: 'Urgent family engagement outside city limits.',
          status: 'pending',
          school_id: schoolId
        }
      ];

      const { error: lErr } = await supabase.from('leave_requests').insert(leavesToInsert);
      if (lErr) console.error('Insert leave requests error:', lErr.message);
      else console.log('Successfully inserted 2 pending leave requests.');
    }
  }

  // 4. Chapter Progress
  const { data: existingProg } = await supabase.from('chapter_progress').select('id');
  const { data: chaps } = await supabase.from('chapters').select('id');
  console.log('Existing chapter progress:', existingProg?.length, 'chapters count:', chaps?.length);

  if ((!existingProg || existingProg.length === 0) && chaps && chaps.length >= 2) {
    const teachers = allProfs?.filter(p => p.email !== 'buildwithsuraj001@gmail.com') || [];
    if (teachers.length >= 2) {
      const progToInsert = [
        {
          chapter_id: chaps[0].id,
          staff_id: teachers[0].id,
          theory_completed: true,
          qa_completed: true,
          notebooks_checked: false,
          school_id: schoolId,
          created_at: dateStr + 'T08:35:00.000Z'
        },
        {
          chapter_id: chaps[1].id,
          staff_id: teachers[1].id,
          theory_completed: true,
          qa_completed: false,
          notebooks_checked: false,
          school_id: schoolId,
          created_at: dateStr + 'T09:12:00.000Z'
        }
      ];

      const { error: progErr } = await supabase.from('chapter_progress').insert(progToInsert);
      if (progErr) console.error('Insert chapter progress error:', progErr.message);
      else console.log('Successfully inserted 2 chapter progress records.');
    }
  }

  console.log('--- Demo Seed Finished ---');
}

seed().catch(console.error);
