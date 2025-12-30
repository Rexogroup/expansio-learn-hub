export interface BusinessProfile {
  id: string;
  company_name: string | null;
  company_description: string | null;
  services_offered: string | null;
  target_industries: string | null;
  icp_revenue_range: string | null;
  icp_employee_count: string | null;
  icp_location: string | null;
  icp_tech_stack: string | null;
  icp_additional_details: string | null;
  pain_points: { problem: string; solution: string }[] | null;
  custom_notes: string | null;
  created_at: string | null;
  user_email?: string;
  user_name?: string;
}

export function generateProfileHTML(profile: BusinessProfile): string {
  const painPointsRows = profile.pain_points?.map((pp, i) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${pp.problem || '-'}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${pp.solution || '-'}</td>
    </tr>
  `).join('') || '<tr><td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center;">No pain points recorded</td></tr>';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Business Profile - ${profile.company_name || 'Unknown Company'}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: #fff;
    }
    .header {
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1f2937;
      font-size: 28px;
    }
    .header .subtitle {
      color: #6b7280;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #6366f1;
      font-size: 18px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .field {
      margin-bottom: 12px;
    }
    .field-label {
      font-weight: 600;
      color: #4b5563;
      display: inline-block;
      min-width: 150px;
    }
    .field-value {
      color: #1f2937;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background: #f3f4f6;
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    .text-block {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Business Profile</h1>
    <div class="subtitle">${profile.company_name || 'Unknown Company'} | Generated: ${formatDate(new Date().toISOString())}</div>
  </div>

  <div class="section">
    <h2>🏢 Company Information</h2>
    <div class="field">
      <span class="field-label">Company Name:</span>
      <span class="field-value">${profile.company_name || 'Not provided'}</span>
    </div>
    <div class="field">
      <span class="field-label">Target Industries:</span>
      <span class="field-value">${profile.target_industries || 'Not provided'}</span>
    </div>
    ${profile.company_description ? `
    <div class="field">
      <span class="field-label">Description:</span>
      <div class="text-block">${profile.company_description}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <h2>💼 Services Offered</h2>
    <div class="text-block">${profile.services_offered || 'Not provided'}</div>
  </div>

  <div class="section">
    <h2>🎯 Ideal Client Profile (ICP)</h2>
    <div class="field">
      <span class="field-label">Revenue Range:</span>
      <span class="field-value">${profile.icp_revenue_range || 'Not specified'}</span>
    </div>
    <div class="field">
      <span class="field-label">Employee Count:</span>
      <span class="field-value">${profile.icp_employee_count || 'Not specified'}</span>
    </div>
    <div class="field">
      <span class="field-label">Location:</span>
      <span class="field-value">${profile.icp_location || 'Not specified'}</span>
    </div>
    <div class="field">
      <span class="field-label">Tech Stack:</span>
      <span class="field-value">${profile.icp_tech_stack || 'Not specified'}</span>
    </div>
    ${profile.icp_additional_details ? `
    <div class="field">
      <span class="field-label">Additional Details:</span>
      <div class="text-block">${profile.icp_additional_details}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <h2>🔥 Pain Points & Solutions</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Problem</th>
          <th>Solution</th>
        </tr>
      </thead>
      <tbody>
        ${painPointsRows}
      </tbody>
    </table>
  </div>

  ${profile.custom_notes ? `
  <div class="section">
    <h2>📝 Additional Notes</h2>
    <div class="text-block">${profile.custom_notes}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div><strong>User:</strong> ${profile.user_name || 'Unknown'} (${profile.user_email || 'No email'})</div>
    <div><strong>Profile Created:</strong> ${formatDate(profile.created_at)}</div>
    <div><strong>Profile ID:</strong> ${profile.id}</div>
  </div>
</body>
</html>
  `;
}

export function downloadProfileAsHTML(profile: BusinessProfile): void {
  const html = generateProfileHTML(profile);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `business-profile-${profile.company_name?.replace(/\s+/g, '-').toLowerCase() || profile.id}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openProfileForPrint(profile: BusinessProfile): void {
  const html = generateProfileHTML(profile);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
