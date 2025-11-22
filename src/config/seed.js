const Role = require("../models/role.model");

const roles = [
  {
    name: "Admin",
    permissions: [
      "create_user",
      "read_user",
      "update_user",
      "delete_user",
      "manage_roles",
      "view_all_results",
    ],
  },
  {
    name: "Doctor",
    permissions: [
      "read_patient_data",
      "create_report",
      "view_assigned_patients",
    ],
  },
  {
    name: "Lab Tech",
    permissions: ["upload_results", "view_lab_tests"],
  },
  {
    name: "Patient",
    permissions: ["read_own_data"],
  },
];

const seedRoles = async () => {
  try {
    for (const roleData of roles) {
      const roleExists = await Role.findOne({ name: roleData.name });
      if (!roleExists) {
        await Role.create(roleData);
        console.log(`Role '${roleData.name}' created.`);
      }
    }
    console.log("Role seeding completed.");
  } catch (error) {
    console.error("Error seeding roles:", error.message);
  }
};

module.exports = seedRoles;
