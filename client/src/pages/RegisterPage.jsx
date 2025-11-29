import React, { useState } from "react";
import axios from "axios";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
  });

  const { username, email, password, confirmPassword, department } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      console.log("Passwords do not match");
      return;
    }
    try {
      const res = await axios.post("/api/v1/auth/register", {
        username,
        email,
        password,
        department,
      });
      console.log(res.data);
    } catch (err) {
      console.error("Registration failed:", err);
      if (err.response) {
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);
        console.error("Error response headers:", err.response.headers);
      } else if (err.request) {
        console.error("Error request:", err.request);
      } else {
        console.error("Error message:", err.message);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-5 text-center">Register</h1>
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., john_doe"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., user@example.com"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter a strong password"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Must be at least 12 characters and include uppercase, lowercase,
            number, and special characters.
          </p>
        </div>
        <div className="mb-4">
          <label className="block mb-2">Department</label>
          <select
            name="department"
            value={formData.department}
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-md bg-white"
            required
          >
            <option value="" disabled>
              Select a department
            </option>
            <option value="Admin">Admin</option>
            <option value="Doctor">Doctor</option>
            <option value="LabTech">Lab Tech</option>
            <option value="Patient">Patient</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-gray-700">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Confirm your password"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
