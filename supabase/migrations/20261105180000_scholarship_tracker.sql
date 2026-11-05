-- Private scholarship desk for two household accounts.
-- Member rows and questionnaire answers are loaded outside this file
-- so family details are not committed.

alter table public.email_outbox
  drop constraint if exists email_outbox_template_check;

alter table public.email_outbox
  add constraint email_outbox_template_check
  check (template in ('welcome', 'weekly_tip', 'scholarship_deadline'));

create table if not exists public.scholarship_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.scholarship_profiles (
  id int primary key default 1 check (id = 1),
  answers jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sponsor text not null,
  url text,
  amount text,
  deadline date,
  deadline_note text,
  notes text,
  criteria jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.scholarship_applications (
  scholarship_id uuid primary key references public.scholarships (id) on delete cascade,
  applied boolean not null default false,
  applied_on date,
  status text not null default 'not_started'
    check (status in ('not_started', 'applied', 'awarded', 'denied', 'skipped')),
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.scholarship_alert_log (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  days_before int not null check (days_before in (14, 7, 2)),
  deadline_on date not null,
  created_at timestamptz not null default now(),
  unique (scholarship_id, user_id, days_before, deadline_on)
);

create index if not exists scholarships_deadline_idx
  on public.scholarships (deadline);

alter table public.scholarship_members enable row level security;
alter table public.scholarship_profiles enable row level security;
alter table public.scholarships enable row level security;
alter table public.scholarship_applications enable row level security;
alter table public.scholarship_alert_log enable row level security;

create or replace function public.scholarship_member()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.scholarship_members m
    where m.user_id = auth.uid()
  );
$$;

revoke all on function public.scholarship_member() from public;
grant execute on function public.scholarship_member() to authenticated;

drop policy if exists "Scholarship members read own row" on public.scholarship_members;
create policy "Scholarship members read own row"
  on public.scholarship_members
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Scholarship members read profile" on public.scholarship_profiles;
create policy "Scholarship members read profile"
  on public.scholarship_profiles
  for select
  to authenticated
  using (public.scholarship_member());

drop policy if exists "Scholarship members update profile" on public.scholarship_profiles;
create policy "Scholarship members update profile"
  on public.scholarship_profiles
  for update
  to authenticated
  using (public.scholarship_member())
  with check (public.scholarship_member());

drop policy if exists "Scholarship members read catalog" on public.scholarships;
create policy "Scholarship members read catalog"
  on public.scholarships
  for select
  to authenticated
  using (public.scholarship_member());

drop policy if exists "Scholarship members add catalog rows" on public.scholarships;
create policy "Scholarship members add catalog rows"
  on public.scholarships
  for insert
  to authenticated
  with check (public.scholarship_member());

drop policy if exists "Scholarship members update catalog" on public.scholarships;
create policy "Scholarship members update catalog"
  on public.scholarships
  for update
  to authenticated
  using (public.scholarship_member())
  with check (public.scholarship_member());

drop policy if exists "Scholarship members read applications" on public.scholarship_applications;
create policy "Scholarship members read applications"
  on public.scholarship_applications
  for select
  to authenticated
  using (public.scholarship_member());

drop policy if exists "Scholarship members insert applications" on public.scholarship_applications;
create policy "Scholarship members insert applications"
  on public.scholarship_applications
  for insert
  to authenticated
  with check (public.scholarship_member());

drop policy if exists "Scholarship members update applications" on public.scholarship_applications;
create policy "Scholarship members update applications"
  on public.scholarship_applications
  for update
  to authenticated
  using (public.scholarship_member())
  with check (public.scholarship_member());

drop policy if exists "Scholarship members read alert log" on public.scholarship_alert_log;
create policy "Scholarship members read alert log"
  on public.scholarship_alert_log
  for select
  to authenticated
  using (public.scholarship_member());

grant select on public.scholarship_members to authenticated;
drop policy if exists "Scholarship members insert profile" on public.scholarship_profiles;
create policy "Scholarship members insert profile"
  on public.scholarship_profiles
  for insert
  to authenticated
  with check (public.scholarship_member() and id = 1);

grant select, insert, update on public.scholarship_profiles to authenticated;
grant select, insert, update on public.scholarships to authenticated;
grant select, insert, update on public.scholarship_applications to authenticated;
grant select on public.scholarship_alert_log to authenticated;
grant all on public.scholarship_members to service_role;
grant all on public.scholarship_profiles to service_role;
grant all on public.scholarships to service_role;
grant all on public.scholarship_applications to service_role;
grant all on public.scholarship_alert_log to service_role;

insert into public.scholarships
  (slug, name, sponsor, url, amount, deadline, deadline_note, notes, criteria, sort_order)
values
  (
    'fafsa-tops-2027',
    '2027-28 FAFSA and TOPS',
    'Federal Student Aid and LOSFA',
    'https://studentaid.gov/h/apply-for-aid/fafsa',
    'TOPS Opportunity pays tuition at UL Lafayette. It does not pay room and board.',
    '2027-02-01',
    'Louisiana priority date February 1, 2027. File by July 1, 2027 for full TOPS funding. FAFSA or the TOPS Online Application counts: https://www.osfa.la.gov/AwardSystem/',
    'ACT 20 and a 3.85 GPA clear TOPS Opportunity when the TOPS core GPA is met. One filing covers TOPS. Do not also file a second TOPS-only form after the FAFSA.',
    '{"minGpa":2.5,"minAct":20,"affiliation":"louisiana","likelyReason":"GPA and ACT meet TOPS Opportunity if the TOPS core curriculum GPA is met. File the FAFSA."}'::jsonb,
    10
  ),
  (
    'go-grant',
    'Louisiana GO Grant',
    'LOSFA',
    'https://mylosfa.la.gov/paying-for-college/fafsa/',
    'Need-based state grant, paid only after the FAFSA.',
    null,
    'No separate date. It rides on the FAFSA.',
    'Kept on the list so it is not mistaken for room-and-board money at this household income.',
    '{"unlikelyAboveIncome":80000,"likelyReason":"Income is in the published need range. Still file the FAFSA."}'::jsonb,
    20
  ),
  (
    'act-retake-ul-1612',
    'ACT retake for UL Lafayette',
    'ACT and UL Lafayette Scholarship Office',
    'https://www.act.org/content/act/en/products-and-services/the-act/registration.html',
    'A 23 unlocks Cypress: $1,250 per semester for eight semesters, on top of TOPS.',
    '2027-05-31',
    'Scores must reach UL Lafayette by May 31, 2027. ACT school code 1612.',
    'Current composite 20 does not meet freshman academic scholarships. The same 23 also reaches TOPS Performance.',
    '{"kind":"retake","targetAct":23}'::jsonb,
    30
  ),
  (
    'ul-admission',
    'UL Lafayette admission',
    'University of Louisiana at Lafayette',
    'https://louisiana.edu/admissions',
    'Required before any UL scholarship letter.',
    null,
    'Apply for admission. On that application, answer yes to child of an alum. Have a birth certificate and the parent diploma ready.',
    'Freshman academic awards are automatic from GPA and ACT once he is admitted. Send every ACT score to code 1612. The legacy mark waives the non-resident fee. A Louisiana resident already pays resident tuition, so it does not pay room and board.',
    '{"kind":"action","likelyReason":"Admission is required before UL can mail a scholarship offer."}'::jsonb,
    40
  ),
  (
    'ul-cypress',
    'UL Lafayette Cypress Scholarship',
    'University of Louisiana at Lafayette',
    'https://louisiana.edu/scholarship/prospective-students/freshman-scholarships',
    '$1,250 per semester for eight semesters ($10,000). Stacks with TOPS.',
    '2027-05-31',
    'Requirements must be met by May 31, 2027. Awarded from the admission file, not a separate essay.',
    'Needs a 3.0 unweighted GPA and ACT 23 to 27 (or SAT 1130). GPA already clears. ACT does not yet.',
    '{"minGpa":3,"targetAct":23,"likelyReason":"GPA and ACT meet Cypress. It is awarded when he is admitted and scores are on file."}'::jsonb,
    50
  ),
  (
    'ul-distinguished',
    'UL Lafayette Distinguished Freshman Leadership',
    'University of Louisiana at Lafayette',
    'https://louisiana.edu/scholarship/prospective-students/freshman-scholarships',
    '$1,000 for freshman year.',
    null,
    'Needs a recruiter recommendation. No separate public ACT floor on this line.',
    'Leadership in high school. Ask the UL recruiter for Allen Parish or the scholarship office.',
    '{"kind":"action","likelyReason":"Possible add-on. It needs a recruiter recommendation, not a higher ACT."}'::jsonb,
    60
  ),
  (
    'ul-magnolia',
    'UL Lafayette Magnolia Scholarship',
    'University of Louisiana at Lafayette',
    'https://louisiana.edu/scholarship/prospective-students/freshman-scholarships',
    '$2,000 academic plus $1,000 housing per semester for eight semesters.',
    '2027-05-31',
    'ACT 28 to 31, or SAT 1300 to 1410, and a 3.0 GPA, by May 31, 2027.',
    'Stretch. Housing money is in this award. It is well above the current ACT.',
    '{"minGpa":3,"targetAct":28,"likelyReason":"GPA and ACT meet Magnolia, including the housing portion."}'::jsonb,
    70
  ),
  (
    'ul-live-oak',
    'UL Lafayette Live Oak Scholarship',
    'University of Louisiana at Lafayette',
    'https://louisiana.edu/scholarship/prospective-students/freshman-scholarships',
    '$3,000 academic plus $2,000 housing per semester for eight semesters.',
    '2027-05-31',
    'ACT 32 or SAT 1420, and a 3.0 GPA, by May 31, 2027.',
    'Stretch. Included so the housing awards are visible next to Cypress.',
    '{"minGpa":3,"targetAct":32,"likelyReason":"GPA and ACT meet Live Oak, including the housing portion."}'::jsonb,
    80
  ),
  (
    'lbec-freshman',
    'LBEC First-Time College Freshman Scholarship',
    'Louisiana Bankers Education Council',
    'https://www.lba.org/LBA/LBA/Financial_Literacy/ScholarshipApp.aspx',
    '$1,000, paid after an acceptance letter.',
    '2027-02-28',
    'Application deadline is the last day of February.',
    'Parent must work at an LBA member bank. First Federal Bank of Louisiana families have received this. Business major qualifies. Needs a 3.0 GPA or ACT 20, plus a transcript and ACT score report.',
    '{"minGpa":3,"minAct":20,"orActInsteadOfGpa":true,"affiliation":"lba_parent","likelyReason":"Parent bank employment, business major, and GPA or ACT meet the published rules."}'::jsonb,
    90
  ),
  (
    'beci-2027',
    'Beauregard Electric Cooperative Scholarship',
    'Beauregard Electric Cooperative',
    'https://www.beci.org/community/scholarship-program/',
    '$1,500 for one academic year, paid in semester installments. Random drawing.',
    '2027-03-01',
    'Expected from prior years. The 2026 form closed March 1, 2026. Confirm the 2027 date on the BECi page before relying on March 1.',
    'Member or member child, 12 months in good standing, Louisiana college, high school GPA 2.0. One-time. One application per student.',
    '{"minGpa":2,"affiliation":"beci","likelyReason":"BECi membership and GPA meet the published rules. Winners are drawn, not scored."}'::jsonb,
    100
  ),
  (
    'swlacu-empowerment',
    'Financial Empowerment Scholarship',
    'Southwest Louisiana Credit Union',
    'https://www.swlacu.com/scholarships-grants',
    '$1,000. The credit union says it can be used for housing, books, or tuition.',
    null,
    '2026 applications are closed. The page says they reopen in spring 2027. Add the date here when it is posted.',
    'Requires a member in good standing, a Louisiana high school graduate enrolled full time, a 3.0 GPA, a transcript, and two recommendations.',
    '{"minGpa":3,"affiliation":"swlacu","likelyReason":"Membership and GPA meet the published rules. Watch for the spring 2027 open date."}'::jsonb,
    110
  ),
  (
    'moody-business',
    'Moody College of Business scholarships',
    'B.I. Moody III College of Business Administration',
    'https://business.louisiana.edu/scholarships',
    'Varies. One spring application covers the college awards.',
    null,
    'Apply the spring after he is a full-time UL business student. Answer yes to child of an alum. The parent degree is on the private profile.',
    'One application covers the college awards, including the Alumni Association scholarship for Moody and the Alumni Chapter scholarship. Most awards need a 3.0 college GPA to pay the spring half.',
    '{"phase":"after_enrollment"}'::jsonb,
    120
  ),
  (
    'kinesiology-followup',
    'Kinesiology department awards',
    'UL Lafayette School of Kinesiology',
    'https://louisiana.edu/scholarship/prospective-students',
    'Unknown until he is admitted. No public high school kinesiology award turned up.',
    null,
    'Check the department after admission and add any real award here.',
    'Minor is kinesiology. College awards, if any, start after enrollment.',
    '{"phase":"after_enrollment"}'::jsonb,
    130
  ),
  (
    'allen-counselor-list',
    'High school counseling office list',
    'Allen Parish high school',
    null,
    'Local awards change every year.',
    null,
    'Bring this year''s list home and add each award with its link and deadline.',
    'Parish and school awards are not on one statewide page.',
    '{"phase":"local_list"}'::jsonb,
    140
  );

insert into public.scholarships
  (slug, name, sponsor, url, amount, deadline, deadline_note, notes, criteria, sort_order)
values
  (
    'younce-2026',
    'Younce, Vtipil, Baznik and Banks Scholarship',
    'Younce, Vtipil, Baznik and Banks',
    'https://www.attorneync.com/scholarship-2026/',
    '$3,000',
    null,
    'LOSFA lists this as the 2026 scholarship and does not publish a deadline. Confirm the form is still open before writing the essay.',
    'High school senior, 3.0 GPA or higher, and an original essay of 400 to 600 words. Applicants 17 or younger need a parent to consent. Found on the LOSFA scholarship search.',
    '{"minGpa":3,"kind":"action","likelyReason":"Senior year and GPA meet the published rules. Confirm the 2026 form is still open."}'::jsonb,
    150
  ),
  (
    'side-hustle-student',
    'Side Hustlin Student Scholarship',
    'The College Investor',
    'https://thecollegeinvestor.com/18899/side-hustle-student-scholarship-opportunity/',
    '$2,500',
    null,
    'LOSFA lists no deadline. The same award appears twice on the LOSFA page.',
    'Open to US students 16 and older. The application is an essay of at least 1,000 words about earning money while in school. Vitality Sweat is a real example if he chooses to use it. This desk does not write the essay.',
    '{"kind":"action","likelyReason":"Age and US residency match. The essay can be about work he already does."}'::jsonb,
    160
  ),
  (
    'dont-text-and-drive',
    'Do Not Text and Drive Scholarship',
    'Digital Responsibility',
    'https://www.digitalresponsibility.org/dont-text-and-drive-scholarship',
    '$1,000',
    null,
    'LOSFA lists no deadline. Recent winners are posted on the sponsor page.',
    'US high school students. The application is one sentence of no more than 140 characters.',
    '{"kind":"action","likelyReason":"US high school students can apply. It is a short statement, not a full essay."}'::jsonb,
    170
  ),
  (
    'too-cool-to-pay',
    'Too Cool to Pay for School Scholarship',
    'Access Scholarships',
    'https://accessscholarships.com/1k-too-cool-to-pay-for-school/',
    '$1,000, four times a year',
    null,
    'LOSFA says drawings end in March, June, September, and December. No single deadline is published.',
    'Open to US high school students. This is a registration drawing, not a scored award. It will not cover a semester of room and board by itself.',
    '{"kind":"action","likelyReason":"Any US high school student can register. Treat it as a drawing."}'::jsonb,
    180
  );

insert into public.scholarships
  (slug, name, sponsor, url, amount, deadline, deadline_note, notes, criteria, sort_order)
values
  (
    'sallie-no-essay',
    'No Essay Scholarship by Sallie',
    'Sallie',
    'https://www.sallie.com/scholarships/no-essay/',
    '$2,000',
    '2026-11-30',
    'This round closes November 30, 2026. It is a monthly drawing, not a 2027-28 UL award. A new round usually opens after this one.',
    'US high school seniors age 17 or older. No essay. Listed beside the Student Scholarships Louisiana business article. Twelve awards.',
    '{"kind":"action","likelyReason":"He is a US high school senior. Confirm he is 17 or older on the form."}'::jsonb,
    190
  ),
  (
    'owl-scholarship',
    'Owl Scholarship',
    'ScholarshipOwl',
    'https://studentscholarships.org/scholarship/19879/owl-scholarship',
    '$50,000',
    '2026-11-30',
    'This round closes November 30, 2026. It is a monthly drawing, not a 2027-28 UL award.',
    'US students 16 or older in high school. The profile has to be filled to 100 percent. Use the apply button on the listing page.',
    '{"kind":"action","likelyReason":"Age and school status match. Finish the ScholarshipOwl profile or the entry does not count."}'::jsonb,
    200
  ),
  (
    'be-bold',
    'Be Bold Scholarship',
    'Bold.org',
    'https://bold.org/scholarships/the-be-bold-no-essay-scholarship/',
    '$25,000',
    '2026-11-30',
    'This round closes November 30, 2026. The sponsor says earlier profiles are favored. It repeats, and it is not a 2027-28 UL award.',
    'No essay. One award for the profile the sponsor calls the boldest. Apply this month if he wants this round.',
    '{"kind":"action","likelyReason":"Open to students. Earlier entries are favored, so this one should not wait until November 30."}'::jsonb,
    210
  ),
  (
    'collegexpress-november-2026',
    'CollegeXpress November Award',
    'CollegeXpress',
    'https://www.collegexpress.com/reg/signup/short?campaign=november26',
    '$3,000',
    '2026-11-30',
    'November 2026 round only. Closes November 30, 2026. Later months have their own drawings.',
    'Age 13 or older and currently in high school. One award. This is the November drawing, not tuition for the 2027-28 school year.',
    '{"kind":"action","likelyReason":"He is in high school and meets the age rule."}'::jsonb,
    220
  ),
  (
    'scholarships360-no-essay',
    'Scholarships360 No Essay Scholarship',
    'Scholarships360',
    'https://studentscholarships.org/scholarship/31366/scholarships360-no-essay-scholarship',
    '$10,000',
    '2026-11-30',
    'This round closes November 30, 2026. It is a monthly drawing, not a 2027-28 UL award.',
    'Open to high school students. The sponsor favors students who also use Scholarships360. Use the apply button on the listing page.',
    '{"kind":"action","likelyReason":"High school students can enter. Using the sponsor site improves the chance."}'::jsonb,
    230
  ),
  (
    'niche-50k-2026',
    'Niche $50,000 No Essay Scholarship',
    'Niche',
    'https://www.niche.com/colleges/scholarships/50k-no-essay-scholarship-2026/',
    '$50,000',
    '2026-12-31',
    'Closes December 31, 2026. One winner by random drawing. Not a 2027-28 UL award, though the money can be used for college costs.',
    'High school students and anyone planning to attend college in the next year. One entry per person. No essay.',
    '{"kind":"action","likelyReason":"He is a high school senior planning to start college in 2027."}'::jsonb,
    240
  );

insert into public.scholarships
  (slug, name, sponsor, url, amount, deadline, deadline_note, notes, criteria, sort_order)
values
  (
    'ul-alumni-senior',
    'UL Lafayette Alumni Association endowed scholarship',
    'UL Lafayette Alumni Association',
    'https://alumni.louisiana.edu/get-involved/ways-give-back/scholarships/application',
    '$2,000 for one academic year.',
    null,
    'April 1, once he is a senior. The published rule is a 3.0 GPA, full-time, and about 90 completed hours. He can apply at 75 hours.',
    'One form covers the ten Alumni Association awards. Child of an alum is an optional question, so answer yes. This is not a high school award. A student can receive it only once.',
    '{"phase":"after_enrollment"}'::jsonb,
    250
  );

insert into public.scholarships
  (slug, name, sponsor, url, amount, deadline, deadline_note, notes, criteria, sort_order)
values
  (
    'regions-riding-forward-q4',
    'Regions Riding Forward scholarship',
    'Regions Bank',
    'https://www.regions.com/ridingforward',
    '$8,000. Four awards in this quarter.',
    '2026-12-31',
    'Q4 closes December 31, 2026 at 11:59 p.m. Central. Use the program key RidingForward. A parent signs if he is under 18.',
    'Louisiana residents age 16 or older with a 2.0 GPA qualify. He starts college in fall 2027, which is inside the rule. Submit a written piece under 500 words or a video under 3 minutes about someone in his community who helped him build confidence. No music in the video. The sponsor rejects AI writing. This desk does not write it.',
    '{"minGpa":2,"kind":"action","likelyReason":"Louisiana residency, age, and GPA meet the Q4 rules. The writing is his to do."}'::jsonb,
    260
  ),
  (
    'jimmy-rane-2027',
    'Jimmy Rane Foundation Scholarship',
    'Jimmy Rane Foundation',
    'https://www.jimmyranefoundation.org/scholarship-eligibility',
    'Up to $6,000',
    '2027-02-05',
    'The application opens December 1, 2026. Materials are due February 5, 2027. Recommendations are due February 10, 2027.',
    'Louisiana high school seniors with a 3.0 GPA can apply. He cannot be a college athlete. Financial need is part of the review, so this is not automatic. The award must be used at an accredited campus, not an online-only program.',
    '{"minGpa":3,"kind":"action","likelyReason":"Louisiana residency and GPA meet the published gates. Need is still part of the review."}'::jsonb,
    270
  ),
  (
    'dyb-2027',
    'Dixie Youth Baseball scholarship',
    'DYB, Inc.',
    'https://www.dybusa.org/DYB/DYB_Scholarship_Application',
    '$2,000. About 100 awards.',
    '2027-03-01',
    'The 2027 form says applications must be received by March 1. One older page still says March 1, 2026. Use the date printed on the 2027 form.',
    'Only if he played at least one season in a Dixie Youth league from ages 5 to 12. Other baseball does not count. Athletic ability is not judged. The form needs class rank, a yearbook photo, a signed note from a league official with the franchise number, a one-page letter from him, and a one-page letter from a parent.',
    '{"affiliation":"dyb","likelyReason":"He played Dixie Youth Baseball before age 13 and is a 2027 senior."}'::jsonb,
    280
  ),
  (
    'hearts-community-2027',
    'Hearts for Community Service Scholarship',
    'Warrick Dunn Charities',
    'https://wdc.org/hearts-for-community-scholarships/',
    '$5,000',
    '2027-06-30',
    'The form is open only from June 1 through June 30, 2027. Winners are announced in August. This round is for the 2027-28 school year.',
    'Louisiana residents with a 2.75 GPA who are volunteering can apply. He needs two letters from organizations he has served, a transcript, proof of residency, and a 500-word essay about that service. Baseball and a job are not the same as volunteer service.',
    '{"minGpa":2.75,"affiliation":"service","likelyReason":"Louisiana residency, GPA, and volunteer service meet the published rules."}'::jsonb,
    290
  );

insert into public.scholarships
  (slug, name, sponsor, url, amount, deadline, deadline_note, notes, criteria, sort_order)
values
  (
    'national-beta-2027',
    'National Beta Scholarship',
    'National Beta Club',
    'https://scholarship.betaclub.org',
    '$1,000 to $25,000. The program awards $500,000 to 365 seniors.',
    '2027-01-14',
    'Open now. Closes January 14, 2027 at 11:59 p.m. Eastern. Semifinalists are named February 11. Their extra materials are due March 14. Winners are named May 1.',
    '12th-grade Senior Beta members registered with National Beta by the deadline. He signs in with his member ID and last name. Ask the school sponsor for that ID. Upload the transcript and an ACT score report. Check that his own service hours are approved in the Beta portal. Group hours may not show on his application. A sponsor letter is not due unless he is a top-100 semifinalist. List UL Lafayette as the first-choice school. This desk does not write the semifinalist essays.',
    '{"affiliation":"beta","likelyReason":"He is a 12th-grade Senior Beta member. The application is open through January 14, 2027."}'::jsonb,
    255
  );

insert into public.scholarship_applications (scholarship_id, applied, status)
select id, false, 'not_started'
from public.scholarships
on conflict (scholarship_id) do nothing;
