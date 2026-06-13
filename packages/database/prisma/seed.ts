import {
  PrismaClient,
  Role,
  MembershipStatus,
  ProgramSource,
  ProgramStatus,
  PlanStatus,
  RecurrenceDay,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Hone@1234';

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  // ── Organisation ──────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'hone-demo' },
    update: {},
    create: {
      name: 'Hone Demo Gym',
      slug: 'hone-demo',
      description: 'A world-class fitness facility with state-of-the-art equipment and expert trainers.',
      address: '12 Fitness Avenue, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400053',
      phone: '+91 98765 43210',
      publicEmail: 'hello@honedemo.fit',
      website: 'https://honedemo.fit',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      openingHours: 'Mon–Sat: 6am–10pm, Sun: 8am–6pm',
      primaryColor: '#ccff00',
    },
  });

  // ── Branches ──────────────────────────────────────────────────────────────
  const mainBranch = await prisma.branch.upsert({
    where: { id: 'seed-branch-main' },
    update: {},
    create: {
      id: 'seed-branch-main',
      organizationId: org.id,
      name: 'Andheri West — Main',
      isDefault: true,
      timezone: 'Asia/Kolkata',
      address: '12 Fitness Avenue, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400053',
      phone: '+91 98765 43210',
      email: 'andheri@honedemo.fit',
      openingHours: 'Mon–Sat: 6am–10pm, Sun: 8am–6pm',
      capacity: 200,
      description: 'Our flagship location with a full Olympic lifting platform and 25m pool.',
    },
  });

  const southBranch = await prisma.branch.upsert({
    where: { id: 'seed-branch-south' },
    update: {},
    create: {
      id: 'seed-branch-south',
      organizationId: org.id,
      name: 'Bandra — South',
      isDefault: false,
      timezone: 'Asia/Kolkata',
      address: '5 Hill Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400050',
      phone: '+91 98765 11111',
      email: 'bandra@honedemo.fit',
      openingHours: 'Mon–Fri: 6am–9pm, Sat–Sun: 7am–7pm',
      capacity: 120,
      description: 'Boutique studio specialising in group fitness and yoga.',
    },
  });

  // ── Super Admin (no org) ───────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'superadmin@hone.fit' },
    update: {},
    create: {
      email: 'superadmin@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      phone: '+91 90000 00000',
      photoUrl: null,
    },
  });

  // ── Org Admin ─────────────────────────────────────────────────────────────
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'orgadmin@hone.fit' },
    update: {},
    create: {
      email: 'orgadmin@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Arjun Sharma',
      role: Role.ORG_ADMIN,
      organizationId: org.id,
      phone: '+91 98200 11111',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'Male',
      employeeId: 'EMP-001',
      hireDate: new Date('2022-01-10'),
      emergencyContactName: 'Priya Sharma',
      emergencyContactPhone: '+91 98200 22222',
    },
  });

  // ── Branch Manager (Main) ─────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'manager@hone.fit' },
    update: {},
    create: {
      email: 'manager@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Meera Nair',
      role: Role.BRANCH_MANAGER,
      branchId: mainBranch.id,
      phone: '+91 97654 33333',
      dateOfBirth: new Date('1990-07-22'),
      gender: 'Female',
      employeeId: 'EMP-002',
      hireDate: new Date('2022-06-01'),
      emergencyContactName: 'Suresh Nair',
      emergencyContactPhone: '+91 97654 44444',
    },
  });

  // ── Trainers ──────────────────────────────────────────────────────────────
  const trainer1 = await prisma.user.upsert({
    where: { email: 'trainer1@hone.fit' },
    update: {},
    create: {
      email: 'trainer1@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Rahul Verma',
      role: Role.TRAINER,
      branchId: mainBranch.id,
      phone: '+91 91234 55555',
      dateOfBirth: new Date('1992-11-05'),
      gender: 'Male',
      employeeId: 'EMP-003',
      hireDate: new Date('2023-01-15'),
      emergencyContactName: 'Kavita Verma',
      emergencyContactPhone: '+91 91234 66666',
      bio: 'Certified strength & conditioning coach with 8 years of experience. Former national-level powerlifter.',
      specializations: ['Strength Training', 'Powerlifting', 'HIIT', 'Body Recomposition'],
      certifications: ['NSCA-CSCS', 'NASM-CPT', 'CrossFit Level 2'],
    },
  });

  await prisma.user.upsert({
    where: { email: 'trainer2@hone.fit' },
    update: {},
    create: {
      email: 'trainer2@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Anjali Menon',
      role: Role.TRAINER,
      branchId: southBranch.id,
      phone: '+91 91234 77777',
      dateOfBirth: new Date('1994-04-18'),
      gender: 'Female',
      employeeId: 'EMP-004',
      hireDate: new Date('2023-03-01'),
      emergencyContactName: 'Rajan Menon',
      emergencyContactPhone: '+91 91234 88888',
      bio: 'Yoga instructor and sports nutritionist. Specialises in flexibility, mindful movement, and recovery programming.',
      specializations: ['Yoga', 'Pilates', 'Flexibility & Mobility', 'Nutrition Coaching'],
      certifications: ['RYT-500', 'ACE-CPT', 'Precision Nutrition Level 1'],
    },
  });

  // ── Members (CLIENT) with health profiles ─────────────────────────────────
  const member1 = await prisma.user.upsert({
    where: { email: 'member1@hone.fit' },
    update: {},
    create: {
      email: 'member1@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Kiran Desai',
      role: Role.CLIENT,
      branchId: mainBranch.id,
      phone: '+91 99887 11111',
      dateOfBirth: new Date('1995-08-30'),
      gender: 'Male',
      memberNumber: 'HNM-0001',
      fitnessGoals: 'Build muscle mass, improve deadlift to 180 kg',
      referredBy: 'Rahul Verma (Trainer)',
      emergencyContactName: 'Sneha Desai',
      emergencyContactPhone: '+91 99887 22222',
    },
  });

  await prisma.memberProfile.upsert({
    where: { userId: member1.id },
    update: {},
    create: {
      userId: member1.id,
      height: 175,
      weight: 78,
      bloodType: 'B+',
      medicalConditions: [],
      allergies: ['Dust'],
      currentMedications: null,
      pastInjuries: 'Minor right shoulder strain (2021) — fully recovered',
      pastSurgeries: null,
      physicianName: 'Dr. Rajesh Mehta',
      physicianPhone: '+91 98100 12345',
      hasSignedWaiver: true,
      waiverSignedAt: new Date('2024-01-15'),
      fitnessLevel: 'INTERMEDIATE',
      primaryGoal: 'MUSCLE_GAIN',
    },
  });

  const member2 = await prisma.user.upsert({
    where: { email: 'member2@hone.fit' },
    update: {},
    create: {
      email: 'member2@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Priya Iyer',
      role: Role.CLIENT,
      branchId: southBranch.id,
      phone: '+91 99887 33333',
      dateOfBirth: new Date('1988-12-10'),
      gender: 'Female',
      memberNumber: 'HNM-0002',
      fitnessGoals: 'Weight loss, improve flexibility, reduce stress',
      referredBy: null,
      emergencyContactName: 'Vikram Iyer',
      emergencyContactPhone: '+91 99887 44444',
    },
  });

  await prisma.memberProfile.upsert({
    where: { userId: member2.id },
    update: {},
    create: {
      userId: member2.id,
      height: 162,
      weight: 68,
      bloodType: 'O+',
      medicalConditions: ['Mild Hypothyroidism'],
      allergies: ['Penicillin'],
      currentMedications: 'Levothyroxine 50mcg daily',
      pastInjuries: null,
      pastSurgeries: null,
      physicianName: 'Dr. Sunita Rao',
      physicianPhone: '+91 98100 67890',
      hasSignedWaiver: true,
      waiverSignedAt: new Date('2024-03-01'),
      fitnessLevel: 'BEGINNER',
      primaryGoal: 'WEIGHT_LOSS',
    },
  });

  const member3 = await prisma.user.upsert({
    where: { email: 'member3@hone.fit' },
    update: {},
    create: {
      email: 'member3@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Aditya Kapoor',
      role: Role.CLIENT,
      branchId: mainBranch.id,
      phone: '+91 99887 55555',
      dateOfBirth: new Date('2000-05-20'),
      gender: 'Male',
      memberNumber: 'HNM-0003',
      fitnessGoals: 'Improve athletic performance for cricket season',
      referredBy: null,
      emergencyContactName: 'Ritu Kapoor',
      emergencyContactPhone: '+91 99887 66666',
      healthNotes: 'Asthma — has inhaler, cleared for moderate-to-high intensity by physician',
    },
  });

  await prisma.memberProfile.upsert({
    where: { userId: member3.id },
    update: {},
    create: {
      userId: member3.id,
      height: 182,
      weight: 72,
      bloodType: 'A+',
      medicalConditions: ['Exercise-Induced Asthma'],
      allergies: [],
      currentMedications: 'Salbutamol inhaler (as needed)',
      pastInjuries: 'Left knee ligament sprain (2023) — recovered',
      pastSurgeries: null,
      physicianName: 'Dr. Anil Joshi',
      physicianPhone: '+91 98100 99999',
      hasSignedWaiver: true,
      waiverSignedAt: new Date('2024-06-10'),
      fitnessLevel: 'INTERMEDIATE',
      primaryGoal: 'ENDURANCE',
    },
  });

  // ── Solo member (no gym — tests solo mode) ───────────────────────────────
  const solo = await prisma.user.upsert({
    where: { email: 'solo@hone.fit' },
    update: {},
    create: {
      email: 'solo@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Nikhil Rao',
      role: Role.CLIENT,
      phone: '+91 99887 77777',
      dateOfBirth: new Date('1993-02-14'),
      gender: 'Male',
      fitnessGoals: 'Stay fit with home workouts, run a 10k',
    },
  });

  await prisma.memberProfile.upsert({
    where: { userId: solo.id },
    update: {},
    create: {
      userId: solo.id,
      height: 178,
      weight: 74,
      medicalConditions: [],
      allergies: [],
      fitnessLevel: 'INTERMEDIATE',
      primaryGoal: 'ENDURANCE',
    },
  });

  // ── Orphan member with a PENDING join request ─────────────────────────────
  const pendingUser = await prisma.user.upsert({
    where: { email: 'pending@hone.fit' },
    update: {},
    create: {
      email: 'pending@hone.fit',
      passwordHash: await hash(SEED_PASSWORD),
      name: 'Sara Fernandes',
      role: Role.CLIENT,
      phone: '+91 99887 88888',
      dateOfBirth: new Date('1997-09-03'),
      gender: 'Female',
      fitnessGoals: 'General fitness, group classes',
    },
  });

  await prisma.memberProfile.upsert({
    where: { userId: pendingUser.id },
    update: {},
    create: { userId: pendingUser.id, fitnessLevel: 'BEGINNER', primaryGoal: 'GENERAL_FITNESS' },
  });

  // ── Memberships ───────────────────────────────────────────────────────────
  // ACTIVE rows for gym members (denormalized pointer on User stays the source of truth for branch)
  const activeMemberships = [
    { user: member1, branchId: mainBranch.id, memberNumber: 'HNM-0001' },
    { user: member2, branchId: southBranch.id, memberNumber: 'HNM-0002' },
    { user: member3, branchId: mainBranch.id, memberNumber: 'HNM-0003' },
  ];
  for (const m of activeMemberships) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: m.user.id, organizationId: org.id } },
      update: {},
      create: {
        userId: m.user.id,
        organizationId: org.id,
        branchId: m.branchId,
        memberNumber: m.memberNumber,
        status: MembershipStatus.ACTIVE,
        joinedAt: m.user.createdAt,
        decidedById: orgAdmin.id,
      },
    });
  }

  // Solo member previously LEFT the demo gym — gives the admin an ENDED history row
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: solo.id, organizationId: org.id } },
    update: {},
    create: {
      userId: solo.id,
      organizationId: org.id,
      branchId: mainBranch.id,
      memberNumber: 'HNM-0099',
      status: MembershipStatus.ENDED,
      joinedAt: new Date('2025-11-01'),
      endedAt: new Date('2026-03-15'),
      endReason: 'LEFT',
      decidedById: orgAdmin.id,
    },
  });

  // PENDING join request awaiting approval in the admin portal
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: pendingUser.id, organizationId: org.id } },
    update: {},
    create: {
      userId: pendingUser.id,
      organizationId: org.id,
      status: MembershipStatus.PENDING,
      requestNote: 'Hi! I just moved to Andheri and would love to join the morning classes.',
    },
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete — password for all accounts: Hone@1234\n');
  console.log('Role            | Email                 | Name');
  console.log('----------------|-----------------------|----------------------');
  console.log('SUPER_ADMIN     | superadmin@hone.fit   | Super Admin');
  console.log('ORG_ADMIN       | orgadmin@hone.fit     | Arjun Sharma');
  console.log('BRANCH_MANAGER  | manager@hone.fit      | Meera Nair (Andheri)');
  console.log('TRAINER         | trainer1@hone.fit     | Rahul Verma (Andheri)');
  console.log('TRAINER         | trainer2@hone.fit     | Anjali Menon (Bandra)');
  console.log('CLIENT          | member1@hone.fit      | Kiran Desai');
  console.log('CLIENT          | member2@hone.fit      | Priya Iyer');
  console.log('CLIENT          | member3@hone.fit      | Aditya Kapoor');
  console.log('CLIENT (solo)   | solo@hone.fit         | Nikhil Rao (no gym)');
  console.log('CLIENT (pending)| pending@hone.fit      | Sara Fernandes (join request)');
  console.log('\nDemo gym slug: hone-demo');
  console.log('Admin portal:   http://localhost:3002');
  console.log('Member portal:  http://localhost:3000\n');

  // ── Workouts ──────────────────────────────────────────────────────────────
  const workouts = [
    // ── Strength ────────────────────────────────────────────────────────────
    {
      name: 'Barbell Back Squat',
      slug: 'barbell-back-squat',
      category: 'STRENGTH',
      muscleGroups: ['Quadriceps', 'Hamstrings', 'Glutes', 'Core', 'Lower Back'],
      equipment: ['Barbell', 'Squat Rack'],
      difficulty: 'INTERMEDIATE',
      description: 'The barbell back squat is widely considered the king of lower-body exercises. It develops overall leg strength, stimulates muscle growth across the quads, hamstrings, and glutes, and demands full-body coordination and core stability.',
      instructions: '1. Set the barbell on a squat rack at upper-chest height.\n2. Step under the bar and position it across your upper traps (high-bar) or rear deltoids (low-bar).\n3. Grip the bar slightly wider than shoulder-width and unrack it by straightening your legs.\n4. Step back, feet shoulder-width apart, toes angled out 10-30°.\n5. Inhale, brace your core hard, and initiate the descent by pushing your hips back and bending your knees simultaneously.\n6. Lower until your thighs are at least parallel to the floor, keeping your chest tall and knees tracking over your toes.\n7. Drive through your full foot to stand back up explosively.\n8. Lock out at the top — hips and knees fully extended — then re-brace for the next rep.',
      tips: 'Keep your chest up and avoid letting your torso fold forward excessively. Push your knees out in the direction of your toes throughout the movement. If you struggle with depth, work on ankle and hip flexor mobility. Film yourself from the side to check parallel depth.',
      sets: '3-5',
      reps: '5-8',
      restSeconds: 180,
      caloriesPerHour: 400,
    },
    {
      name: 'Conventional Deadlift',
      slug: 'conventional-deadlift',
      category: 'STRENGTH',
      muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back', 'Traps', 'Forearms', 'Core'],
      equipment: ['Barbell'],
      difficulty: 'INTERMEDIATE',
      description: 'The conventional deadlift is a fundamental compound lift that trains the entire posterior chain. It is the single best exercise for building raw pulling strength and overall back thickness.',
      instructions: '1. Stand with feet hip-width apart, bar over mid-foot.\n2. Hinge at the hips and bend your knees to grip the bar just outside your legs — double overhand or mixed grip.\n3. Drop your hips until your shins touch the bar, then lift your chest to create a flat back.\n4. Take a big breath, brace your core and lats (think: protect your armpits).\n5. Push the floor away rather than thinking of pulling the bar up.\n6. Keep the bar in contact with your body as it passes your shins and knees.\n7. Lock out at the top: hips fully extended, shoulders back, glutes squeezed.\n8. Hinge back and bend your knees to lower the bar under control.',
      tips: 'Never round your lower back under load. Keep the bar close — it should drag up your shins. If the bar drifts away from your body you lose leverage fast. A belt helps at heavy loads but learn to brace without one first.',
      sets: '3-5',
      reps: '3-6',
      restSeconds: 180,
      caloriesPerHour: 420,
    },
    {
      name: 'Barbell Bench Press',
      slug: 'barbell-bench-press',
      category: 'STRENGTH',
      muscleGroups: ['Chest', 'Triceps', 'Front Deltoids'],
      equipment: ['Barbell', 'Flat Bench', 'Rack'],
      difficulty: 'INTERMEDIATE',
      description: 'The barbell bench press is the standard measure of upper-body pushing strength and the primary mass-builder for the chest. It trains the pecs, front deltoids, and triceps through a long range of motion under heavy load.',
      instructions: '1. Lie on the bench with your eyes directly under the bar.\n2. Grip the bar with hands slightly wider than shoulder-width.\n3. Arch your back slightly and retract your shoulder blades into the bench.\n4. Unrack the bar and hold it directly over your mid-chest.\n5. Inhale and lower the bar with control to your lower chest, elbows at roughly 45-75° from your torso.\n6. Touch (do not bounce) your chest and press back up in a slight arc toward your face.\n7. Fully extend your arms at the top without locking out aggressively.\n8. Always use a spotter or safety bars for heavy sets.',
      tips: 'Keep your feet planted flat on the floor for maximum leg drive. Pinching your shoulder blades back protects your shoulders and creates a stronger pressing platform. Elbows flaring 90° out is the most common cause of shoulder injury — keep them tucked.',
      sets: '3-5',
      reps: '5-10',
      restSeconds: 150,
      caloriesPerHour: 380,
    },
    {
      name: 'Overhead Press',
      slug: 'overhead-press',
      category: 'STRENGTH',
      muscleGroups: ['Shoulders', 'Triceps', 'Upper Traps', 'Core'],
      equipment: ['Barbell'],
      difficulty: 'INTERMEDIATE',
      description: 'The overhead press — also called the military press — is the definitive vertical pushing exercise. It builds thick, round shoulders and powerful triceps while demanding serious core stability to keep the spine neutral.',
      instructions: '1. Set the bar at upper-chest height in a squat rack.\n2. Grip just outside shoulder-width, elbows slightly in front of the bar.\n3. Unrack and hold the bar at your clavicles, wrists stacked directly under the bar.\n4. Stand with feet hip-width apart, glutes and core tight.\n5. Press the bar straight up while slightly moving your head back to let the bar pass your face.\n6. Once the bar clears your forehead, press up and slightly back so it ends directly over your mid-foot.\n7. Lower under control back to the starting position at your clavicles.',
      tips: 'Squeeze your glutes hard — it prevents you from over-extending your lower back. Do not press in front of your body; the bar should pass as close to your face as possible. Wrists should stay stacked, not bent back.',
      sets: '3-4',
      reps: '6-10',
      restSeconds: 120,
      caloriesPerHour: 360,
    },
    {
      name: 'Barbell Bent-Over Row',
      slug: 'barbell-bent-over-row',
      category: 'STRENGTH',
      muscleGroups: ['Upper Back', 'Lats', 'Biceps', 'Rear Deltoids', 'Core'],
      equipment: ['Barbell'],
      difficulty: 'INTERMEDIATE',
      description: 'The barbell bent-over row is the premier horizontal pulling exercise for building a thick upper back. It trains the lats, rhomboids, traps, and rear deltoids with heavy compound loading.',
      instructions: '1. Stand with feet hip-width apart, bar over mid-foot.\n2. Hinge at the hips until your torso is roughly 45° from horizontal, knees slightly bent.\n3. Grip the bar just wider than shoulder-width, double overhand.\n4. Brace your core to keep your spine neutral throughout.\n5. Pull the bar toward your lower sternum, driving your elbows up and back.\n6. Squeeze your shoulder blades together at the top.\n7. Lower the bar with control back to a dead hang.\n8. Do not use momentum — the back stays stationary.',
      tips: 'The angle of your torso determines which muscles are emphasized: more horizontal = upper back; more upright = lower lats. Avoid jerking the weight up with your hips — if you need to do this, the weight is too heavy.',
      sets: '3-4',
      reps: '6-10',
      restSeconds: 120,
      caloriesPerHour: 370,
    },
    {
      name: 'Pull-Up',
      slug: 'pull-up',
      category: 'STRENGTH',
      muscleGroups: ['Lats', 'Biceps', 'Upper Back', 'Core'],
      equipment: ['Pull-Up Bar'],
      difficulty: 'INTERMEDIATE',
      description: 'The pull-up is the gold standard of bodyweight upper-body exercises. It targets the lats and biceps through a full range of motion and builds the wide, V-tapered back associated with elite fitness.',
      instructions: '1. Hang from the bar with an overhand grip slightly wider than shoulder-width.\n2. Depress and retract your shoulder blades before initiating the pull.\n3. Engage your core and cross your feet behind you to prevent swinging.\n4. Pull your elbows down toward your hips and squeeze your lats.\n5. Continue until your chin clears the bar or your chest touches it.\n6. Pause briefly at the top.\n7. Lower slowly and with control to a full dead hang.\n8. Repeat without using momentum.',
      tips: 'Think about pulling your elbows to your hips, not your hands to your ears — this cue activates the lats more effectively. Add a pause at the bottom dead hang to eliminate kipping. Progress with a resistance band or assisted machine before adding weight.',
      sets: '3-4',
      reps: '5-12',
      restSeconds: 90,
      caloriesPerHour: 350,
    },
    {
      name: 'Dumbbell Bicep Curl',
      slug: 'dumbbell-bicep-curl',
      category: 'STRENGTH',
      muscleGroups: ['Biceps', 'Brachialis', 'Forearms'],
      equipment: ['Dumbbells'],
      difficulty: 'BEGINNER',
      description: 'The dumbbell bicep curl is the most direct exercise for building arm size and strength. Training each arm independently corrects strength imbalances and allows a full supinated range of motion.',
      instructions: '1. Stand or sit with a dumbbell in each hand, arms fully extended.\n2. Rotate your palms to face forward (supinated grip).\n3. Keeping your upper arms pinned to your sides, curl the dumbbells up toward your shoulders.\n4. Squeeze your biceps hard at the top.\n5. Slowly lower back to the starting position over 2-3 seconds.\n6. Do not swing your torso or let your elbows drift forward.',
      tips: 'Keep your elbows stationary — they should not drift forward during the curl. Fully supinate (rotate) at the top for maximum bicep contraction. Slow, controlled negatives build more muscle than fast drops.',
      sets: '3-4',
      reps: '10-15',
      restSeconds: 60,
      caloriesPerHour: 280,
    },
    {
      name: 'Tricep Pushdown',
      slug: 'tricep-pushdown',
      category: 'STRENGTH',
      muscleGroups: ['Triceps'],
      equipment: ['Cable Machine', 'Rope or Bar Attachment'],
      difficulty: 'BEGINNER',
      description: 'The cable tricep pushdown is the most popular isolation exercise for the triceps. The cable provides constant tension throughout the entire range of motion, making it highly effective for building arm size.',
      instructions: '1. Attach a rope or straight bar to the high pulley of a cable machine.\n2. Stand facing the machine, grip the attachment, and position your elbows at your sides.\n3. Start with forearms roughly parallel to the floor.\n4. Press the attachment down until your arms are fully extended.\n5. Squeeze your triceps hard at the bottom.\n6. Let the weight pull your forearms back up slowly — do not let your elbows flare out.',
      tips: 'Keep your upper arms locked to your sides throughout. Leaning slightly forward at the hips helps you stay stable and maintain form. Use the rope for a wider range of motion by spreading the ends apart at the bottom.',
      sets: '3-4',
      reps: '12-15',
      restSeconds: 60,
      caloriesPerHour: 250,
    },
    {
      name: 'Lat Pulldown',
      slug: 'lat-pulldown',
      category: 'STRENGTH',
      muscleGroups: ['Lats', 'Biceps', 'Rear Deltoids'],
      equipment: ['Cable Machine', 'Lat Pulldown Bar'],
      difficulty: 'BEGINNER',
      description: 'The lat pulldown is the machine-based alternative to the pull-up, ideal for beginners building toward bodyweight pulling strength. It directly targets the lats and allows precise load control.',
      instructions: '1. Sit at the lat pulldown station with thighs secured under the pad.\n2. Grip the bar wider than shoulder-width with an overhand grip.\n3. Lean back slightly — about 20-30° — and initiate the pull by depressing your shoulder blades.\n4. Pull the bar down to your upper chest, driving your elbows down toward your hips.\n5. Squeeze your lats at the bottom of the movement.\n6. Let the bar rise slowly back to the top, achieving a full stretch in your lats.\n7. Do not pull behind your neck.',
      tips: 'Think "elbows to hips" rather than "hands to chest." Avoid using too much momentum or rocking your torso excessively. The stretch at the top is just as important as the contraction at the bottom.',
      sets: '3-4',
      reps: '10-12',
      restSeconds: 75,
      caloriesPerHour: 290,
    },
    {
      name: 'Leg Press',
      slug: 'leg-press',
      category: 'STRENGTH',
      muscleGroups: ['Quadriceps', 'Hamstrings', 'Glutes'],
      equipment: ['Leg Press Machine'],
      difficulty: 'BEGINNER',
      description: 'The leg press is a machine-based lower body compound exercise that allows heavy loading without the technical demands of the squat. It is excellent for quad development and is often used for high-rep hypertrophy work.',
      instructions: '1. Sit in the leg press machine with your back flat against the pad.\n2. Place your feet shoulder-width apart on the platform — higher foot placement targets glutes/hamstrings, lower targets quads.\n3. Disengage the safety handles and lower the platform by bending your knees.\n4. Lower until your knees form roughly a 90° angle — do not let your lower back peel off the pad.\n5. Press through your heels to extend your legs back to the start.\n6. Do not lock out your knees aggressively at the top.\n7. Re-engage the safety handles before exiting.',
      tips: 'Never let your lower back round off the pad at the bottom — this puts dangerous pressure on the spine. Keep your feet flat on the platform throughout. Vary foot placement across sessions to hit different muscle emphases.',
      sets: '3-4',
      reps: '10-15',
      restSeconds: 90,
      caloriesPerHour: 320,
    },
    {
      name: 'Romanian Deadlift',
      slug: 'romanian-deadlift',
      category: 'STRENGTH',
      muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back'],
      equipment: ['Barbell', 'Dumbbells'],
      difficulty: 'INTERMEDIATE',
      description: 'The Romanian deadlift (RDL) is the premier hamstring isolation exercise among compound movements. It creates intense tension in the hamstrings through a loaded hip hinge, making it essential for posterior chain development.',
      instructions: '1. Hold the bar at hip height with an overhand grip, feet hip-width apart.\n2. With a slight bend in the knees, hinge at the hips by pushing them back.\n3. Lower the bar along your legs, maintaining contact (it should drag down your thighs and shins).\n4. Continue lowering until you feel a deep stretch in your hamstrings — typically just below the knee.\n5. Drive your hips forward to return to standing, squeezing your glutes at the top.\n6. Keep your back flat and core braced throughout.',
      tips: 'The movement is all about the hip hinge — think "push hips back" rather than "lower the bar." Your back should stay neutral, not round. If you feel it in your lower back and not your hamstrings, you are likely bending too much at the knees.',
      sets: '3-4',
      reps: '8-12',
      restSeconds: 90,
      caloriesPerHour: 340,
    },
    // ── Cardio ──────────────────────────────────────────────────────────────
    {
      name: 'Treadmill Run',
      slug: 'treadmill-run',
      category: 'CARDIO',
      muscleGroups: ['Quadriceps', 'Hamstrings', 'Calves', 'Glutes', 'Core'],
      equipment: ['Treadmill'],
      difficulty: 'BEGINNER',
      description: 'Treadmill running is the most accessible form of cardiovascular training. It improves aerobic capacity, burns calories, strengthens the lower body, and can be precisely controlled for speed and incline.',
      instructions: '1. Set the treadmill to a gentle warm-up speed (5-6 km/h) for 3-5 minutes.\n2. Gradually increase speed to your target pace.\n3. Stand tall with a slight forward lean from the ankles — not the waist.\n4. Land with a mid-foot strike beneath your hips, not in front of you.\n5. Keep your arms relaxed, elbows at 90°, hands unclenched.\n6. Breathe in a rhythmic pattern (e.g., 3 steps inhale, 2 steps exhale).\n7. Cool down at a slow walk for 3-5 minutes before stopping.',
      tips: 'Avoid holding the handrails — this reduces caloric burn and promotes poor posture. Use incline (1-2%) to better simulate outdoor running. Monitor your heart rate to stay in the right training zone.',
      durationMinutes: 30,
      caloriesPerHour: 550,
    },
    {
      name: 'Stationary Bike',
      slug: 'stationary-bike',
      category: 'CARDIO',
      muscleGroups: ['Quadriceps', 'Hamstrings', 'Calves', 'Glutes'],
      equipment: ['Stationary Bike'],
      difficulty: 'BEGINNER',
      description: 'The stationary bike provides effective low-impact cardiovascular training that is easy on the joints. It is ideal for recovery sessions, beginners, or those with knee or hip concerns.',
      instructions: '1. Adjust the seat height so your knee has a slight bend at the bottom of the pedal stroke.\n2. Set the handlebar height for a comfortable, slightly bent-elbow position.\n3. Begin pedalling at a comfortable resistance for 2-3 minutes to warm up.\n4. Increase resistance to a level where conversation is possible but challenging.\n5. Maintain a cadence of 60-90 RPM for steady-state cardio.\n6. Keep your upper body still and avoid rocking side to side.\n7. Cool down gradually by reducing resistance for 3-5 minutes.',
      tips: 'Adjust the seat to the correct height — too low creates knee pain, too high reduces power. Push through your heel at the bottom of each pedal stroke to engage your glutes more effectively.',
      durationMinutes: 30,
      caloriesPerHour: 450,
    },
    {
      name: 'Jump Rope',
      slug: 'jump-rope',
      category: 'CARDIO',
      muscleGroups: ['Calves', 'Shoulders', 'Core', 'Forearms'],
      equipment: ['Jump Rope'],
      difficulty: 'BEGINNER',
      description: 'Skipping rope is one of the most efficient cardiovascular exercises available. It dramatically improves coordination, agility, and cardiovascular fitness while burning a high number of calories per minute.',
      instructions: '1. Hold one handle in each hand at hip height, elbows close to your body.\n2. Begin by swinging the rope overhead and jumping as it passes under your feet.\n3. Stay on the balls of your feet throughout — keep jumps low (just enough to clear the rope).\n4. Use wrist rotation to turn the rope, not your whole arms.\n5. Keep your core tight and land softly.\n6. Aim for consistent rhythm before increasing speed.\n7. Rest 30-60 seconds between 1-2 minute jump intervals.',
      tips: 'Start with slower, controlled jumps before building speed. If you trip, simply restart — consistency builds coordination. The main power source is your wrists, not your arms. A good rope length is when the handles reach your armpits when you stand on the center of the rope.',
      durationMinutes: 15,
      caloriesPerHour: 700,
    },
    {
      name: 'Rowing Machine',
      slug: 'rowing-machine',
      category: 'CARDIO',
      muscleGroups: ['Back', 'Biceps', 'Legs', 'Core', 'Shoulders'],
      equipment: ['Rowing Machine (Ergometer)'],
      difficulty: 'BEGINNER',
      description: 'The rowing machine is a full-body cardiovascular exercise that engages 86% of the body\'s muscles. It provides excellent cardiovascular conditioning with low joint impact, and uniquely trains both the pushing (legs) and pulling (back/arms) patterns.',
      instructions: '1. Sit on the seat, strap your feet into the footrests so the strap crosses the widest part of your foot.\n2. Grip the handle with an overhand grip, slightly wider than shoulder-width.\n3. The drive phase: push through your legs first, then lean your torso back to 11 o\'clock, then pull the handle to your lower chest.\n4. The recovery phase: extend your arms first, lean forward to 1 o\'clock, then slide the seat forward.\n5. Maintain a ratio of roughly 1:2 (drive time to recovery time).\n6. Maintain a damper setting of 3-5 for most training.',
      tips: 'The legs provide 60% of the power — do not rush to pull with your arms. A common mistake is bending the arms before the legs are fully extended. Think: LEGS → BODY → ARMS on the drive, and ARMS → BODY → LEGS on the recovery.',
      durationMinutes: 20,
      caloriesPerHour: 600,
    },
    {
      name: 'Elliptical Trainer',
      slug: 'elliptical-trainer',
      category: 'CARDIO',
      muscleGroups: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Arms'],
      equipment: ['Elliptical Machine'],
      difficulty: 'BEGINNER',
      description: 'The elliptical trainer provides a full-body, low-impact cardiovascular workout. Its smooth elliptical motion eliminates impact on the joints while still providing the cardiovascular benefits of running.',
      instructions: '1. Step onto the pedals and grip the moving handles.\n2. Begin with a comfortable resistance level and stride at a natural pace.\n3. Keep your back straight and avoid hunching over the handles.\n4. Push and pull the handles actively to engage your upper body.\n5. Maintain a consistent stride rate (aim for 130-160 strides per minute).\n6. Vary resistance and incline throughout the session for better conditioning.\n7. Try pedalling in reverse to shift emphasis to your hamstrings and glutes.',
      tips: 'Do not lean heavily on the handles — this transfers your body weight away from your legs and reduces caloric burn. Engage your core throughout. Using the handles actively rather than just holding them dramatically increases calories burned.',
      durationMinutes: 30,
      caloriesPerHour: 480,
    },
    {
      name: 'Stair Climber',
      slug: 'stair-climber',
      category: 'CARDIO',
      muscleGroups: ['Glutes', 'Quadriceps', 'Hamstrings', 'Calves', 'Core'],
      equipment: ['Stair Climber Machine'],
      difficulty: 'BEGINNER',
      description: 'The stair climber provides a highly effective cardiovascular and lower-body workout that mimics the demands of climbing stairs. It burns significant calories while building glute and leg strength simultaneously.',
      instructions: '1. Step onto the machine and select your desired speed.\n2. Keep your back straight and avoid leaning on the handrails.\n3. Step completely down on each step — do not just use the balls of your feet.\n4. Maintain a pace that is challenging but sustainable (you should be able to speak in short sentences).\n5. Engage your core throughout to protect your lower back.\n6. Cool down by stepping slowly for the final 2-3 minutes.',
      tips: 'Leaning forward and resting on the handrails reduces the workout effectiveness by up to 25%. Try not to look down — it promotes poor posture. Increase the step height setting for more glute activation.',
      durationMinutes: 20,
      caloriesPerHour: 520,
    },
    // ── HIIT / Plyometrics ───────────────────────────────────────────────────
    {
      name: 'Burpee',
      slug: 'burpee',
      category: 'HIIT',
      muscleGroups: ['Full Body', 'Chest', 'Shoulders', 'Core', 'Legs'],
      equipment: [],
      difficulty: 'INTERMEDIATE',
      description: 'The burpee is a full-body calisthenic exercise that combines a squat, plank, push-up, and jump into one fluid movement. It is one of the most effective exercises for cardiovascular conditioning and total-body strength.',
      instructions: '1. Start standing with feet shoulder-width apart.\n2. Lower your hands to the floor and jump or step both feet back to a high plank position.\n3. Perform a push-up (optional but recommended).\n4. Jump or step both feet back to your hands.\n5. Explosively jump upward, reaching your arms overhead.\n6. Land softly with slightly bent knees and immediately begin the next rep.',
      tips: 'Move through each component with control before building speed. Modify by stepping instead of jumping at both transitions. Common mistakes include sagging hips in the plank position and poor landing mechanics on the jump.',
      sets: '4-6',
      reps: '10-15',
      restSeconds: 45,
      caloriesPerHour: 750,
    },
    {
      name: 'Box Jump',
      slug: 'box-jump',
      category: 'PLYOMETRICS',
      muscleGroups: ['Quadriceps', 'Glutes', 'Calves', 'Hamstrings', 'Core'],
      equipment: ['Plyo Box'],
      difficulty: 'INTERMEDIATE',
      description: 'Box jumps are an explosive plyometric exercise that develops lower-body power, fast-twitch muscle fibre recruitment, and athletic explosiveness. They train the body\'s ability to generate maximum force in minimum time.',
      instructions: '1. Stand in front of the box with feet shoulder-width apart, about 30-45 cm from the edge.\n2. Bend your knees into a quarter squat and swing your arms back.\n3. Explosively jump upward, swinging your arms forward for momentum.\n4. Land softly on the box with both feet simultaneously, knees slightly bent, absorbing the impact through your legs.\n5. Stand tall at the top.\n6. Step back down one foot at a time — do not jump down, as this is where most injuries occur.\n7. Reset your stance and repeat.',
      tips: 'Start with a lower box height and prioritize landing quality before adding height. Always step down — jumping down multiplies the landing force. If your shins are regularly hitting the box, you need more height on your jump or a lower box.',
      sets: '4-5',
      reps: '5-8',
      restSeconds: 90,
      caloriesPerHour: 600,
    },
    {
      name: 'Battle Ropes',
      slug: 'battle-ropes',
      category: 'HIIT',
      muscleGroups: ['Shoulders', 'Arms', 'Core', 'Back', 'Legs'],
      equipment: ['Battle Ropes'],
      difficulty: 'INTERMEDIATE',
      description: 'Battle rope training provides intense cardiovascular conditioning while simultaneously building upper body strength and core stability. The heavy, undulating ropes create constant muscular tension and dramatically elevate the heart rate.',
      instructions: '1. Stand facing the anchor point with feet shoulder-width apart, knees slightly bent.\n2. Grip one rope in each hand with a neutral grip (palms facing each other).\n3. Create alternating waves by raising one arm to shoulder height while the other drops, in a quick rhythmic pattern.\n4. Keep your core braced and avoid rounding your back.\n5. Perform alternating waves for 20-30 seconds, then rest.\n6. Variations: simultaneous waves, lateral slams, circles, power slams.',
      tips: 'Stay low in an athletic stance — the power comes from your hips and legs as much as your arms. As you fatigue, maintain the wave pattern even at reduced intensity rather than stopping completely. The closer you stand to the anchor, the harder the exercise becomes.',
      sets: '4-6',
      reps: '20-30 seconds on, 30 seconds rest',
      restSeconds: 30,
      caloriesPerHour: 680,
    },
    // ── Core ────────────────────────────────────────────────────────────────
    {
      name: 'Plank',
      slug: 'plank',
      category: 'CORE',
      muscleGroups: ['Core', 'Shoulders', 'Glutes', 'Back'],
      equipment: [],
      difficulty: 'BEGINNER',
      description: 'The plank is the foundational isometric core exercise. It builds endurance and stability in the deep core stabilisers — the muscles responsible for protecting the spine and transferring force between the upper and lower body.',
      instructions: '1. Start face-down, forearms on the floor, elbows directly under your shoulders.\n2. Rise onto your toes, forming a straight line from head to heel.\n3. Engage your core as if bracing for a punch — do not let your hips sag or pike up.\n4. Squeeze your glutes, quads, and pull your navel toward your spine.\n5. Breathe steadily — do not hold your breath.\n6. Hold for the prescribed duration.',
      tips: 'Quality over time: a 30-second perfect plank beats a 90-second sagging one. Common errors are hips too high (like a downward dog) or hips sinking toward the floor. If your lower back hurts, your core is not engaged enough — reset.',
      sets: '3-4',
      reps: '30-60 seconds',
      restSeconds: 45,
      caloriesPerHour: 200,
    },
    {
      name: 'Mountain Climbers',
      slug: 'mountain-climbers',
      category: 'CORE',
      muscleGroups: ['Core', 'Shoulders', 'Hip Flexors', 'Legs'],
      equipment: [],
      difficulty: 'BEGINNER',
      description: 'Mountain climbers combine core strengthening with cardiovascular conditioning. They train dynamic core stability while elevating the heart rate, making them an efficient two-in-one exercise.',
      instructions: '1. Start in a high plank position — hands under shoulders, body in a straight line.\n2. Drive your right knee toward your chest as far as possible.\n3. Quickly switch legs, extending the right leg back as you drive the left knee forward.\n4. Continue alternating at a controlled pace, keeping your hips level.\n5. Do not let your hips rise or your back arch.\n6. Breathe continuously throughout.',
      tips: 'Keep your hips from bouncing up and down — they should stay at hip height throughout. The faster you go, the more cardiovascular the exercise becomes; slower reps with a longer range of motion emphasise core strength more.',
      sets: '3-4',
      reps: '20-30 seconds',
      restSeconds: 45,
      caloriesPerHour: 550,
    },
  ];

  // Unsplash cover images — assigned per slug so re-seeding keeps them current
  const U = 'https://images.unsplash.com/photo-';
  const Q = '?auto=format&fit=crop&w=800&q=80';
  const IMAGES: Record<string, string> = {
    'barbell-back-squat':      `${U}1526506118085-60ce8714f8c5${Q}`,
    'conventional-deadlift':   `${U}1534438327276-14e5300c3a48${Q}`,
    'barbell-bench-press':     `${U}1571019614242-c5c5dee9f50b${Q}`,
    'overhead-press':          `${U}1581009146145-b5ef050c2e1e${Q}`,
    'barbell-bent-over-row':   `${U}1532029837206-abbe2b7620e3${Q}`,
    'pull-up':                 `${U}1541534741688-6078c6bfb5c5${Q}`,
    'dumbbell-bicep-curl':     `${U}1581009137042-c552e485697a${Q}`,
    'tricep-pushdown':         `${U}1574680096145-d05b474e2155${Q}`,
    'lat-pulldown':            `${U}1583454110551-21f2fa2afe61${Q}`,
    'leg-press':               `${U}1434608519344-49d77a699e1d${Q}`,
    'romanian-deadlift':       `${U}1534438327276-14e5300c3a48${Q}`,
    'treadmill-run':           `${U}1538805060514-97d9cc17730c${Q}`,
    'stationary-bike':         `${U}1534787238916-9ba6764efd4f${Q}`,
    'jump-rope':               `${U}1518611012118-696072aa579a${Q}`,
    'rowing-machine':          `${U}1552674605-db6ffd4facb5${Q}`,
    'elliptical-trainer':      `${U}1544033527-b192daee1f5b${Q}`,
    'stair-climber':           `${U}1509833903111-9cb142f644e4${Q}`,
    'burpee':                  `${U}1549060279-7e168fcee0c2${Q}`,
    'box-jump':                `${U}1549060279-7e168fcee0c2${Q}`,
    'battle-ropes':            `${U}1599058917765-a780eda07a3e${Q}`,
    'plank':                   `${U}1571019614242-c5c5dee9f50b${Q}`,
    'mountain-climbers':       `${U}1599058917212-d750089bc07e${Q}`,
  };

  let workoutsCreated = 0;
  for (const w of workouts) {
    const coverImageUrl = IMAGES[w.slug] ?? null;
    await prisma.workout.upsert({
      where: { slug: w.slug },
      update: { coverImageUrl, reviewStatus: 'APPROVED', isPublished: true },
      create: { ...w, coverImageUrl, reviewStatus: 'APPROVED', isPublished: true },
    });
    workoutsCreated++;
  }

  console.log(`\n🏋️  ${workoutsCreated} workouts seeded (${[...new Set(workouts.map(w => w.category))].join(', ')})\n`);

  // ── System Assessment Templates ───────────────────────────────────────────
  // Seeded as global templates (organizationId: null). createdById uses superAdmin.
  const superAdmin = await prisma.user.findUnique({ where: { email: 'superadmin@hone.fit' } });
  if (!superAdmin) {
    console.log('⚠️  superadmin@hone.fit not found — skipping assessment template seed');
    return;
  }

  const weeklyCheckIn = await prisma.assessmentTemplate.upsert({
    where: { id: 'seed-template-weekly-checkin' },
    update: {},
    create: {
      id: 'seed-template-weekly-checkin',
      organizationId: null,
      createdById: superAdmin.id,
      name: 'Weekly check-in',
      description: 'Standard weekly progress check covering body metrics, energy, and sleep quality.',
      isActive: true,
      fields: [
        { id: 'weight',       label: 'Weight',        type: 'number',   unit: 'kg',  required: false },
        { id: 'bodyFat',      label: 'Body Fat',       type: 'number',   unit: '%',   required: false },
        { id: 'waist',        label: 'Waist',          type: 'number',   unit: 'cm',  required: false },
        { id: 'chest',        label: 'Chest',          type: 'number',   unit: 'cm',  required: false },
        { id: 'hips',         label: 'Hips',           type: 'number',   unit: 'cm',  required: false },
        { id: 'energyLevel',  label: 'Energy Level',   type: 'select',   required: false, options: ['Low', 'Medium', 'High'] },
        { id: 'sleepQuality', label: 'Sleep Quality',  type: 'select',   required: false, options: ['Poor', 'Fair', 'Good', 'Excellent'] },
        { id: 'notes',        label: 'Notes',          type: 'textarea', required: false },
      ],
    },
  });

  const initialFitness = await prisma.assessmentTemplate.upsert({
    where: { id: 'seed-template-initial-fitness' },
    update: {},
    create: {
      id: 'seed-template-initial-fitness',
      organizationId: null,
      createdById: superAdmin.id,
      name: 'Initial fitness assessment',
      description: 'Baseline fitness evaluation for new members covering physical metrics and goals.',
      isActive: true,
      fields: [
        { id: 'weight',           label: 'Weight',            type: 'number',   unit: 'kg',   required: false },
        { id: 'height',           label: 'Height',            type: 'number',   unit: 'cm',   required: false },
        { id: 'restingHeartRate', label: 'Resting Heart Rate', type: 'number',  unit: 'bpm',  required: false },
        { id: 'pushUps',          label: 'Push-ups',          type: 'number',   unit: 'reps', required: false },
        { id: 'sitUps',           label: 'Sit-ups',           type: 'number',   unit: 'reps', required: false },
        { id: 'flexibilityTest',  label: 'Flexibility Test',  type: 'select',   required: false,
          options: ['Poor', 'Below Average', 'Average', 'Above Average', 'Excellent'] },
        { id: 'fitnessGoals',     label: 'Fitness Goals',     type: 'textarea', required: false },
        { id: 'medicalNotes',     label: 'Medical Notes',     type: 'textarea', required: false },
      ],
    },
  });

  console.log(`\n📋  Assessment templates seeded:`);
  console.log(`    • ${weeklyCheckIn.name} (${(weeklyCheckIn.fields as any[]).length} fields)`);
  console.log(`    • ${initialFitness.name} (${(initialFitness.fields as any[]).length} fields)\n`);

  // ── Programs (TRAINER / SELF / AI sources) ────────────────────────────────
  const bySlug = async (slug: string) => {
    const w = await prisma.workout.findUnique({ where: { slug } });
    if (!w) throw new Error(`Seed workout missing: ${slug}`);
    return w;
  };
  const squat = await bySlug('barbell-back-squat');
  const pullUp = await bySlug('pull-up');
  const treadmill = await bySlug('treadmill-run');
  const plank = await bySlug('plank');
  const rowing = await bySlug('rowing-machine');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Trainer-assigned program for member1 (today)
  await prisma.workoutProgram.upsert({
    where: { id: 'seed-program-trainer' },
    update: {},
    create: {
      id: 'seed-program-trainer',
      clientId: member1.id,
      trainerId: trainer1.id,
      workoutId: squat.id,
      source: ProgramSource.TRAINER,
      scheduledDate: today,
      targetSets: '4',
      targetReps: '6',
      targetWeightKg: 100,
      status: ProgramStatus.PENDING,
      notes: 'Focus on depth and bracing. Last warm-up set at 80 kg.',
    },
  });

  // Self-created recurring program for the solo member
  await prisma.workoutProgram.upsert({
    where: { id: 'seed-program-self' },
    update: {},
    create: {
      id: 'seed-program-self',
      clientId: solo.id,
      trainerId: null,
      workoutId: pullUp.id,
      source: ProgramSource.SELF,
      isRecurring: true,
      recurrenceDays: [RecurrenceDay.MON, RecurrenceDay.WED, RecurrenceDay.FRI],
      targetSets: '4',
      targetReps: '8',
      status: ProgramStatus.PENDING,
      notes: 'Strict form, full dead hang.',
    },
  });

  // AI-generated program for the solo member (today)
  await prisma.workoutProgram.upsert({
    where: { id: 'seed-program-ai' },
    update: {},
    create: {
      id: 'seed-program-ai',
      clientId: solo.id,
      trainerId: null,
      workoutId: treadmill.id,
      source: ProgramSource.AI,
      scheduledDate: today,
      targetDurationMinutes: 30,
      status: ProgramStatus.PENDING,
      notes: 'Zone 2 pace — conversational effort.',
    },
  });

  // ── DRAFT AI program plan for the solo member (tests the review flow) ─────
  const nextMonday = new Date(today);
  nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));

  await prisma.programPlan.upsert({
    where: { id: 'seed-plan-ai-draft' },
    update: {},
    create: {
      id: 'seed-plan-ai-draft',
      organizationId: null,
      trainerId: null,
      clientId: solo.id,
      source: ProgramSource.AI,
      name: '2-Week Endurance Kickstart',
      description: 'AI-generated starter block mixing steady-state cardio, pulling strength, and core stability.',
      totalWeeks: 2,
      startDate: nextMonday,
      status: PlanStatus.DRAFT,
    },
  });

  await prisma.programPlanEntry.deleteMany({ where: { planId: 'seed-plan-ai-draft' } });
  await prisma.programPlanEntry.createMany({
    data: [
      { planId: 'seed-plan-ai-draft', workoutId: treadmill.id, weekNumber: 1, dayOfWeek: RecurrenceDay.MON, targetDurationMinutes: 30 },
      { planId: 'seed-plan-ai-draft', workoutId: pullUp.id,    weekNumber: 1, dayOfWeek: RecurrenceDay.WED, targetSets: 4, targetReps: 8 },
      { planId: 'seed-plan-ai-draft', workoutId: plank.id,     weekNumber: 1, dayOfWeek: RecurrenceDay.FRI, targetSets: 3, targetDurationMinutes: 5 },
      { planId: 'seed-plan-ai-draft', workoutId: rowing.id,    weekNumber: 2, dayOfWeek: RecurrenceDay.MON, targetDurationMinutes: 20 },
      { planId: 'seed-plan-ai-draft', workoutId: pullUp.id,    weekNumber: 2, dayOfWeek: RecurrenceDay.WED, targetSets: 5, targetReps: 8 },
      { planId: 'seed-plan-ai-draft', workoutId: treadmill.id, weekNumber: 2, dayOfWeek: RecurrenceDay.FRI, targetDurationMinutes: 35 },
    ],
  });

  console.log('🤖  Programs seeded: 1 TRAINER (member1), 1 SELF + 1 AI (solo), 1 DRAFT AI plan (solo, 6 entries)\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
