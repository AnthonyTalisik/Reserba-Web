// Choices for the "Organization / department" dropdowns.

export const STUDENT_ORGS = [
  'College of Computer Studies',
  'College of Nursing',
  'College of Tourism and Hospitality Management',
  'College of Criminology',
  'College of Business and Accountancy',
  'College of Education',
  'College of Engineering and Architecture',
  'College of Arts and Sciences',
  'Student Council / Student Government',
  'Other student organization',
]

export const FACULTY_ORGS = [
  'General meeting - all staff',
  'Faculty meeting - department',
  'Faculty meeting - college-wide',
  'Academic Council',
  'Faculty Association',
  'Research and Extension Office',
  'Student Affairs Office',
  'Guidance and Counseling Office',
  "Registrar's Office",
  'Library Services',
  'Administrative / HR Office',
  'Other office or committee',
]

export const orgsForRole = (role) => (role === 'FACULTY' ? FACULTY_ORGS : STUDENT_ORGS)
