/**
 * departmentMapper.js
 * Maps a grievance category to the responsible government department.
 */

const DEPARTMENT_MAP = {
  'Roads':         { departmentId: 'PWD_ROADS',   departmentName: 'Public Works Dept (PWD)' },
  'Water Supply':  { departmentId: 'JAL_SHAKTI',  departmentName: 'Jal Shakti Dept' },
  'Electricity':   { departmentId: 'DISCOM',       departmentName: 'DISCOM / Power Dept' },
  'Others':        { departmentId: 'GENERAL',      departmentName: 'General Administration Dept' },
};

const DEFAULT_DEPARTMENT = { departmentId: 'GENERAL', departmentName: 'General Administration Dept' };

/**
 * @param {string} category - Grievance category from the frontend
 * @returns {{ departmentId: string, departmentName: string }}
 */
function mapDepartment(category) {
  if (!category) return DEFAULT_DEPARTMENT;
  // Normalize: trim + title-case match
  const key = Object.keys(DEPARTMENT_MAP).find(
    (k) => k.toLowerCase() === category.trim().toLowerCase()
  );
  return key ? DEPARTMENT_MAP[key] : DEFAULT_DEPARTMENT;
}

module.exports = { mapDepartment, DEPARTMENT_MAP };
