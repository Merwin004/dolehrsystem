require('dotenv').config();
const { db, initDB } = require('./database/db');

const SG_SALARY = {
  1:13012, 2:13740, 3:14514, 4:15339, 5:16218,
  6:17159, 7:18139, 8:19179, 9:20278, 10:21441,
  11:22700, 12:24007, 13:25439, 14:26959, 15:28559,
  16:30867, 17:33470, 18:36619, 19:40208, 20:44573,
  21:49835, 22:55901, 23:62449, 24:70016, 25:78455,
  26:87932, 27:98507, 28:110399, 29:123628, 30:138461,
};

const positions = [
  // Administrative Service (AS)
  { position: 'Administrative Officer II',  plantilla_item: 'AS-001', salary_grade: 15, department: 'Administrative Service (AS)',               place_of_assignment: '2nd Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Administrative Aide VI',     plantilla_item: 'AS-002', salary_grade: 6,  department: 'Administrative Service (AS)',               place_of_assignment: '2nd Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Supply Officer I',           plantilla_item: 'AS-003', salary_grade: 8,  department: 'Administrative Service (AS)',               place_of_assignment: '2nd Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },

  // Financial and Management Service (FMS)
  { position: 'Accountant II',              plantilla_item: 'FMS-001', salary_grade: 16, department: 'Financial and Management Service (FMS)',   place_of_assignment: '4th Floor, General Luna Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Budget Officer I',           plantilla_item: 'FMS-002', salary_grade: 11, department: 'Financial and Management Service (FMS)',   place_of_assignment: '4th Floor, General Luna Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Cashier II',                 plantilla_item: 'FMS-003', salary_grade: 11, department: 'Financial and Management Service (FMS)',   place_of_assignment: '4th Floor, General Luna Wing, DOLE Building, Intramuros, Manila' },

  // Internal Audit Service (IAS)
  { position: 'Administrative Officer III', plantilla_item: 'IAS-001', salary_grade: 18, department: 'Internal Audit Service (IAS)',             place_of_assignment: '4th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Accountant I',               plantilla_item: 'IAS-002', salary_grade: 14, department: 'Internal Audit Service (IAS)',             place_of_assignment: '4th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Clerk III',                  plantilla_item: 'IAS-003', salary_grade: 6,  department: 'Internal Audit Service (IAS)',             place_of_assignment: '4th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },

  // Information and Publication Service (IPS)
  { position: 'Information Technology Officer I', plantilla_item: 'IPS-001', salary_grade: 11, department: 'Information and Publication Service (IPS)', place_of_assignment: '5th Floor, General Luna Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Records Officer I',          plantilla_item: 'IPS-002', salary_grade: 8,  department: 'Information and Publication Service (IPS)', place_of_assignment: '5th Floor, General Luna Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Administrative Assistant II', plantilla_item: 'IPS-003', salary_grade: 8, department: 'Information and Publication Service (IPS)', place_of_assignment: '5th Floor, General Luna Wing, DOLE Building, Intramuros, Manila' },

  // Human Resource Development Service (HRDS)
  { position: 'Human Resource Management Officer I',  plantilla_item: 'HRDS-001', salary_grade: 11, department: 'Human Resource Development Service (HRDS)', place_of_assignment: '5th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Administrative Officer II',            plantilla_item: 'HRDS-002', salary_grade: 15, department: 'Human Resource Development Service (HRDS)', place_of_assignment: '5th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Administrative Aide IV',               plantilla_item: 'HRDS-003', salary_grade: 4,  department: 'Human Resource Development Service (HRDS)', place_of_assignment: '5th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },

  // Planning Service (PS)
  { position: 'Planning Officer II',        plantilla_item: 'PS-001', salary_grade: 15, department: 'Planning Service (PS)',                     place_of_assignment: '6th Floor DOLE Building, Intramuros, Manila' },
  { position: 'Administrative Assistant III', plantilla_item: 'PS-002', salary_grade: 9, department: 'Planning Service (PS)',                    place_of_assignment: '6th Floor DOLE Building, Intramuros, Manila' },
  { position: 'Clerk II',                   plantilla_item: 'PS-003', salary_grade: 5,  department: 'Planning Service (PS)',                     place_of_assignment: '6th Floor DOLE Building, Intramuros, Manila' },

  // Legal Service (LS)
  { position: 'Attorney II',                plantilla_item: 'LS-001', salary_grade: 19, department: 'Legal Service (LS)',                        place_of_assignment: '6th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Legal Officer I',            plantilla_item: 'LS-002', salary_grade: 11, department: 'Legal Service (LS)',                        place_of_assignment: '6th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },
  { position: 'Clerk I',                    plantilla_item: 'LS-003', salary_grade: 3,  department: 'Legal Service (LS)',                        place_of_assignment: '6th Floor, Muralla Wing, DOLE Building, Intramuros, Manila' },

  // RSPU
  { position: 'Administrative Officer IV',             plantilla_item: 'RSPU-001', salary_grade: 22, department: 'RSPU', place_of_assignment: 'DOLE Building, Intramuros, Manila' },
  { position: 'Human Resource Management Officer II',  plantilla_item: 'RSPU-002', salary_grade: 15, department: 'RSPU', place_of_assignment: 'DOLE Building, Intramuros, Manila' },
  { position: 'Administrative Aide III',               plantilla_item: 'RSPU-003', salary_grade: 3,  department: 'RSPU', place_of_assignment: 'DOLE Building, Intramuros, Manila' },
];

async function seed() {
  await initDB();

  let inserted = 0;
  let skipped  = 0;

  for (const p of positions) {
    const salary = SG_SALARY[p.salary_grade] || 0;
    try {
      await db.execute(`
        INSERT INTO publications
          (position, plantilla_item, salary_grade, monthly_salary, department, place_of_assignment, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'for_publication', 1)
      `, [
        p.position,
        p.plantilla_item,
        String(p.salary_grade),
        `₱${salary.toLocaleString()}`,
        p.department,
        p.place_of_assignment,
      ]);
      console.log(`  ✓ ${p.plantilla_item}  ${p.position}`);
      inserted++;
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        console.log(`  – skipped (already exists): ${p.plantilla_item}`);
        skipped++;
      } else {
        throw e;
      }
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
