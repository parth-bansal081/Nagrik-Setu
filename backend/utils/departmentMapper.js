const DEPARTMENT_MAP = {
  'Roads':         { departmentId: 'PWD_ROADS',   departmentName: 'Public Works Dept (PWD)' },
  'Water Supply':  { departmentId: 'JAL_SHAKTI',  departmentName: 'Jal Shakti Dept' },
  'Electricity':   { departmentId: 'DISCOM',       departmentName: 'DISCOM / Power Dept' },
  'Others':        { departmentId: 'GENERAL',      departmentName: 'General Administration Dept' },
};

const DEFAULT_DEPARTMENT = { departmentId: 'GENERAL', departmentName: 'General Administration Dept' };

function mapDepartment(category) {
  if (!category) return DEFAULT_DEPARTMENT;
  const key = Object.keys(DEPARTMENT_MAP).find(
    (k) => k.toLowerCase() === category.trim().toLowerCase()
  );
  return key ? DEPARTMENT_MAP[key] : DEFAULT_DEPARTMENT;
}

module.exports = { mapDepartment, DEPARTMENT_MAP };
