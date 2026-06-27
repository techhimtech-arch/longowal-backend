const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class CsvService {
  /**
   * Parse CSV content to array of objects
   * @param {string} csvContent - Raw CSV content
   * @param {string[]} requiredHeaders - Required column headers
   * @returns {Object} { data: [], errors: [], headers: [] }
   */
  parseCSV(csvContent, requiredHeaders = []) {
    const result = {
      data: [],
      errors: [],
      headers: []
    };

    try {
      // Split by lines and handle different line endings
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        result.errors.push('CSV must have headers and at least one data row');
        return result;
      }

      // Parse headers (first line)
      const headers = this.parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      result.headers = headers;

      // Validate required headers
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h.toLowerCase()));
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
        return result;
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = this.parseCSVLine(line);
          const row = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
          });

          // Convert to camelCase keys
          const camelCaseRow = this.toCamelCase(row);
          camelCaseRow._rowNumber = i + 1;
          result.data.push(camelCaseRow);
        } catch (parseError) {
          result.errors.push(`Row ${i + 1}: ${parseError.message}`);
        }
      }

    } catch (error) {
      result.errors.push(`CSV parsing failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  }

  /**
   * Convert snake_case/kebab-case keys to camelCase
   */
  toCamelCase(obj) {
    const result = {};
    for (const key in obj) {
      const camelKey = key.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
      result[camelKey] = obj[key];
    }
    return result;
  }

  /**
   * Generate CSV template for student import
   */
  generateStudentTemplate() {
    const headers = [
      'admissionNumber',
      'firstName',
      'lastName',
      'gender',
      'dateOfBirth',
      'classId',
      'sectionId',
      'rollNumber',
      'parentName',
      'parentPhone',
      'parentEmail',
      'address'
    ];

    const sampleRow = [
      'ADM001',
      'John',
      'Doe',
      'Male',
      '2015-05-15',
      '<classId>',
      '<sectionId>',
      '1',
      'Parent Name',
      '9876543210',
      'parent@email.com',
      '123 Street, City'
    ];

    return `${headers.join(',')}\n${sampleRow.join(',')}`;
  }

  /**
   * Validate student data from CSV
   */
  validateStudentRow(row, rowNumber) {
    const errors = [];

    if (!row.admissionnumber && !row.admissionNumber) {
      errors.push(`Row ${rowNumber}: Admission number is required`);
    }

    if (!row.firstname && !row.firstName) {
      errors.push(`Row ${rowNumber}: First name is required`);
    }

    if (!row.classid && !row.classId) {
      errors.push(`Row ${rowNumber}: Class ID is required`);
    }

    if (!row.sectionid && !row.sectionId) {
      errors.push(`Row ${rowNumber}: Section ID is required`);
    }

    // Validate gender if provided
    const gender = row.gender;
    if (gender && !['male', 'female', 'other'].includes(gender.toLowerCase())) {
      errors.push(`Row ${rowNumber}: Gender must be Male, Female, or Other`);
    }

    // Validate phone if provided
    const phone = row.parentphone || row.parentPhone;
    if (phone && !/^\d{10,15}$/.test(phone.replace(/[-\s]/g, ''))) {
      errors.push(`Row ${rowNumber}: Invalid phone number format`);
    }

    return errors;
  }
}

module.exports = new CsvService();
