document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  let token = sessionStorage.getItem('edupulse_token') || null;
  let currentUser = JSON.parse(sessionStorage.getItem('edupulse_user') || 'null');
  let currentStudents = [];
  let selectedStudentForDelete = null;
  let currentViewMode = 'grid'; // 'grid' or 'table'
  let parsedBulkStudents = [];

  // Active filter state
  let activeFilterRules = [];
  let filterSchemaFields = [];

  // ==========================================
  // INACTIVITY SECURITY ENGINE (3 MIN AUTO-LOGOUT)
  // ==========================================
  const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 Minutes = 180,000 ms
  let inactivityCheckInterval = null;
  let lastActivityTime = parseInt(sessionStorage.getItem('edupulse_last_activity') || '0', 10);

  function updateActivityTimestamp() {
    const now = Date.now();
    lastActivityTime = now;
    sessionStorage.setItem('edupulse_last_activity', String(now));
  }

  function startInactivityTimer() {
    stopInactivityTimer();
    inactivityCheckInterval = setInterval(checkInactivityExpiration, 2000);
  }

  function stopInactivityTimer() {
    if (inactivityCheckInterval) {
      clearInterval(inactivityCheckInterval);
      inactivityCheckInterval = null;
    }
  }

  function checkInactivityExpiration() {
    if (!token || !currentUser) return;
    const now = Date.now();
    const storedLastActivity = parseInt(sessionStorage.getItem('edupulse_last_activity') || '0', 10);
    const effective = storedLastActivity > 0 ? storedLastActivity : lastActivityTime;

    if (effective > 0 && (now - effective >= INACTIVITY_TIMEOUT_MS)) {
      performAutoLogout('Security Protocol: Automatically logged out after 3 minutes of inactivity. Password required to log in.');
    }
  }

  function performAutoLogout(reason) {
    stopInactivityTimer();
    token = null;
    currentUser = null;

    sessionStorage.removeItem('edupulse_token');
    sessionStorage.removeItem('edupulse_user');
    sessionStorage.removeItem('edupulse_last_activity');

    // Clean legacy localStorage auth keys
    localStorage.removeItem('edupulse_token');
    localStorage.removeItem('edupulse_user');
    localStorage.removeItem('edupulse_last_activity');

    showLogin();
    if (reason) {
      showToast(reason, 'error');
    }
  }

  // Global activity tracking listeners
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evtName => {
    window.addEventListener(evtName, () => {
      if (token && currentUser) {
        updateActivityTimestamp();
      }
    }, { passive: true });
  });

  // Automatically check expiration when switching back to tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && token && currentUser) {
      checkInactivityExpiration();
    }
  });

  // ==========================================
  // THEME MANAGEMENT (PERSISTENT LIGHT / DARK)
  // ==========================================
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  const storedTheme = localStorage.getItem('edupulse_theme') || 'dark';
  applyTheme(storedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('edupulse_theme', theme);
    if (themeIcon && themeText) {
      if (theme === 'dark') {
        themeIcon.className = 'fa-solid fa-sun';
        themeText.textContent = 'Dark Mode';
      } else {
        themeIcon.className = 'fa-solid fa-moon';
        themeText.textContent = 'Light Mode';
      }
    }
  }

  // ==========================================
  // DOM ELEMENTS
  // ==========================================
  const toastContainer = document.getElementById('toastContainer');
  const loginSection = document.getElementById('loginSection');
  const portalSection = document.getElementById('portalSection');
  const fullPageStudentView = document.getElementById('fullPageStudentView');

  // Dashboard Section Switchers (declared early to prevent TDZ error in showPortal)
  const studentDashboardSection = document.getElementById('studentDashboardSection');
  const facultyDashboardSection = document.getElementById('facultyDashboardSection');
  const facultyDashboardBtn = document.getElementById('facultyDashboardBtn');

  // Auth Elements
  const loginForm = document.getElementById('loginForm');
  const loginEmailInput = document.getElementById('loginEmail');
  const loginPasswordInput = document.getElementById('loginPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const passwordEyeIcon = document.getElementById('passwordEyeIcon');
  const logoutBtn = document.getElementById('logoutBtn');
  const facultyNameDisplay = document.getElementById('facultyNameDisplay');
  const facultyRoleDisplay = document.getElementById('facultyRoleDisplay');
  const facultyRoleBadge = document.getElementById('facultyRoleBadge');

  // Search & Basic Toolbar Filters
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const branchFilter = document.getElementById('branchFilter');
  const sectionFilter = document.getElementById('sectionFilter');
  const yearFilter = document.getElementById('yearFilter');
  const semesterFilter = document.getElementById('semesterFilter');
  const admissionTypeFilter = document.getElementById('admissionTypeFilter');
  const gridViewBtn = document.getElementById('gridViewBtn');
  const tableViewBtn = document.getElementById('tableViewBtn');
  const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const activeFiltersBar = document.getElementById('activeFiltersBar');
  const filterPillsContainer = document.getElementById('filterPillsContainer');
  const clearAllFiltersBarBtn = document.getElementById('clearAllFiltersBarBtn');

  // Bulk Delete Filtered Buttons & Modals
  const bulkDeleteFilteredBtn = document.getElementById('bulkDeleteFilteredBtn');
  const filteredDeleteCount = document.getElementById('filteredDeleteCount');
  const bulkDeleteModal = document.getElementById('bulkDeleteModal');
  const bulkDeleteCountDisplay = document.getElementById('bulkDeleteCountDisplay');
  const cancelBulkDeleteBtn = document.getElementById('cancelBulkDeleteBtn');
  const confirmBulkDeleteBtn = document.getElementById('confirmBulkDeleteBtn');

  // Dynamic Smart Filter Engine Panel Elements
  const toggleSmartFilterBtn = document.getElementById('toggleSmartFilterBtn');
  const customFilterDashboardSection = document.getElementById('customFilterDashboardSection');
  const dashResetRulesBtn = document.getElementById('dashResetRulesBtn');
  const filterAttributeSearchInput = document.getElementById('filterAttributeSearchInput');
  const attributeTypeBadge = document.getElementById('attributeTypeBadge');
  const dashFilterFieldSelect = document.getElementById('dashFilterFieldSelect');
  const dashFilterInputContainer = document.getElementById('dashFilterInputContainer');
  const dashAddRuleBtn = document.getElementById('dashAddRuleBtn');
  const dashRulesList = document.getElementById('dashRulesList');
  const activeFilterBadge = document.getElementById('activeFilterBadge');

  // View Containers
  const studentGridView = document.getElementById('studentGridView');
  const studentTableView = document.getElementById('studentTableView');
  const studentTableBody = document.getElementById('studentTableBody');
  const emptyState = document.getElementById('emptyState');
  const resetSearchBtn = document.getElementById('resetSearchBtn');

  // Add / Edit Student Modal Elements
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const formModal = document.getElementById('formModal');
  const formModalCard = document.getElementById('formModalCard');
  const formModalTitle = document.getElementById('formModalTitle');
  const closeFormModalBtn = document.getElementById('closeFormModalBtn');
  const cancelFormBtn = document.getElementById('cancelFormBtn');
  const studentForm = document.getElementById('studentForm');
  const studentFormId = document.getElementById('studentFormId');

  // Form Inputs
  const formRollNumber = document.getElementById('formRollNumber');
  const formName = document.getElementById('formName');
  const formAdmissionType = document.getElementById('formAdmissionType');
  const formBranch = document.getElementById('formBranch');
  const formSection = document.getElementById('formSection');
  const formYear = document.getElementById('formYear');
  const formSemester = document.getElementById('formSemester');
  const formAdmissionNo = document.getElementById('formAdmissionNo');
  const formDob = document.getElementById('formDob');
  const formGender = document.getElementById('formGender');
  const formReligion = document.getElementById('formReligion');
  const formNationality = document.getElementById('formNationality');
  const formEntranceType = document.getElementById('formEntranceType');
  const formCetRank = document.getElementById('formCetRank');
  const formGpa = document.getElementById('formGpa');
  const formMarksPercent = document.getElementById('formMarksPercent');
  const formAttendance = document.getElementById('formAttendance');
  const formPhone = document.getElementById('formPhone');
  const formPersonalEmail = document.getElementById('formPersonalEmail');
  const formCollegeEmail = document.getElementById('formCollegeEmail');
  const formAdhar = document.getElementById('formAdhar');
  const formAbcId = document.getElementById('formAbcId');
  const formBankAcc = document.getElementById('formBankAcc');
  const formReimbursement = document.getElementById('formReimbursement');
  const formTransport = document.getElementById('formTransport');
  const formRemarks = document.getElementById('formRemarks');
  const formFatherName = document.getElementById('formFatherName');
  const formFatherOccupation = document.getElementById('formFatherOccupation');
  const formFatherMobile = document.getElementById('formFatherMobile');
  const formMotherName = document.getElementById('formMotherName');
  const formMotherOccupation = document.getElementById('formMotherOccupation');
  const formMotherMobile = document.getElementById('formMotherMobile');
  const formAnnualIncome = document.getElementById('formAnnualIncome');
  const formAddress = document.getElementById('formAddress');
  const formPhotoFile = document.getElementById('formPhotoFile');
  const formPhotoPreview = document.getElementById('formPhotoPreview');
  const formPhotoUrl = document.getElementById('formPhotoUrl');

  // Single Delete Modal Elements
  const deleteModal = document.getElementById('deleteModal');
  const deleteStudentName = document.getElementById('deleteStudentName');
  const deleteStudentRoll = document.getElementById('deleteStudentRoll');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Bulk Import Modal Elements
  const openImportModalBtn = document.getElementById('openImportModalBtn');
  const bulkImportModal = document.getElementById('bulkImportModal');
  const closeImportModalBtn = document.getElementById('closeImportModalBtn');
  const closeImportModalFooterBtn = document.getElementById('closeImportModalFooterBtn');
  const importDropzone = document.getElementById('importDropzone');
  const importFileInput = document.getElementById('importFileInput');
  const browseFileLink = document.getElementById('browseFileLink');
  const selectedFileInfo = document.getElementById('selectedFileInfo');
  const selectedFileName = document.getElementById('selectedFileName');
  const removeSelectedFileBtn = document.getElementById('removeSelectedFileBtn');
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
  const importPreviewContainer = document.getElementById('importPreviewContainer');
  const parsedRowCount = document.getElementById('parsedRowCount');
  const currentModeBadge = document.getElementById('currentModeBadge');
  const importPreviewTbody = document.getElementById('importPreviewTbody');
  const submitBulkImportBtn = document.getElementById('submitBulkImportBtn');
  const importReportCard = document.getElementById('importReportCard');

  // Mode radio cards
  const modeCardUpdate = document.getElementById('modeCardUpdate');
  const modeCardAdd = document.getElementById('modeCardAdd');
  const modeCardBoth = document.getElementById('modeCardBoth');

  // Full-Page Student View Navigation & Profile Elements
  const backToDashboardBtn = document.getElementById('backToDashboardBtn');
  const fpRollHeader = document.getElementById('fpRollHeader');
  const fpActionGroup = document.getElementById('fpActionGroup');
  const fpEditBtn = document.getElementById('fpEditBtn');
  const fpDeleteBtn = document.getElementById('fpDeleteBtn');
  const fpPhoto = document.getElementById('fpPhoto');
  const fpName = document.getElementById('fpName');
  const fpBranch = document.getElementById('fpBranch');
  const fpSecYear = document.getElementById('fpSecYear');
  const fpSemester = document.getElementById('fpSemester');
  const fpGender = document.getElementById('fpGender');
  const fpAdmissionTypeBadge = document.getElementById('fpAdmissionTypeBadge');
  const fpCgpa = document.getElementById('fpCgpa');
  const fpMarksPercent = document.getElementById('fpMarksPercent');
  const fpAttendance = document.getElementById('fpAttendance');
  const fpRollNo = document.getElementById('fpRollNo');
  const fpAdmissionNo = document.getElementById('fpAdmissionNo');
  const fpAdmissionTypeDetail = document.getElementById('fpAdmissionTypeDetail');
  const fpCourseBranch = document.getElementById('fpCourseBranch');
  const fpSecYearDetail = document.getElementById('fpSecYearDetail');
  const fpSemDetail = document.getElementById('fpSemDetail');
  const fpDob = document.getElementById('fpDob');
  const fpGenderReligion = document.getElementById('fpGenderReligion');
  const fpNationality = document.getElementById('fpNationality');
  const fpCet = document.getElementById('fpCet');
  const fpPhone = document.getElementById('fpPhone');
  const fpPersonalEmail = document.getElementById('fpPersonalEmail');
  const fpCollegeEmail = document.getElementById('fpCollegeEmail');
  const fpAdhar = document.getElementById('fpAdhar');
  const fpAbcId = document.getElementById('fpAbcId');
  const fpBankAcc = document.getElementById('fpBankAcc');
  const fpReimbursement = document.getElementById('fpReimbursement');
  const fpTransport = document.getElementById('fpTransport');
  const fpEduTableBody = document.getElementById('fpEduTableBody');
  const fpFatherName = document.getElementById('fpFatherName');
  const fpFatherOccupation = document.getElementById('fpFatherOccupation');
  const fpFatherMobile = document.getElementById('fpFatherMobile');
  const fpMotherName = document.getElementById('fpMotherName');
  const fpMotherOccupation = document.getElementById('fpMotherOccupation');
  const fpMotherMobile = document.getElementById('fpMotherMobile');
  const fpAnnualIncome = document.getElementById('fpAnnualIncome');
  const fpAddress = document.getElementById('fpAddress');
  const fpStudentRemarks = document.getElementById('fpStudentRemarks');

  // Excel Export Modal Elements
  const excelExportModal = document.getElementById('excelExportModal');
  const closeExcelExportModalBtn = document.getElementById('closeExcelExportModalBtn');
  const cancelExcelExportBtn = document.getElementById('cancelExcelExportBtn');
  const excelSelectAllBtn = document.getElementById('excelSelectAllBtn');
  const excelSelectDefaultBtn = document.getElementById('excelSelectDefaultBtn');
  const excelDeselectAllBtn = document.getElementById('excelDeselectAllBtn');
  const excelSelectedCount = document.getElementById('excelSelectedCount');
  const confirmDownloadExcelBtn = document.getElementById('confirmDownloadExcelBtn');

  // User Profile Modal Elements
  const openProfileBtn = document.getElementById('openProfileBtn');
  const profileModal = document.getElementById('profileModal');
  const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
  const cancelProfileBtn = document.getElementById('cancelProfileBtn');
  const editProfileToggleBtn = document.getElementById('editProfileToggleBtn');
  const profileViewMode = document.getElementById('profileViewMode');
  const profileForm = document.getElementById('profileForm');
  const pvFacultyId = document.getElementById('pvFacultyId');
  const pvName = document.getElementById('pvName');
  const pvEmail = document.getElementById('pvEmail');
  const pvPhone = document.getElementById('pvPhone');
  const pvDepartment = document.getElementById('pvDepartment');
  const pvDesignation = document.getElementById('pvDesignation');
  const profileRoleBadge = document.getElementById('profileRoleBadge');
  const pvPasswordStatus = document.getElementById('pvPasswordStatus');
  const profileFacultyId = document.getElementById('profileFacultyId');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profilePhone = document.getElementById('profilePhone');
  const profileDepartment = document.getElementById('profileDepartment');
  const profileDesignation = document.getElementById('profileDesignation');
  const profileNewPassword = document.getElementById('profileNewPassword');
  const profilePwdNotice = document.getElementById('profilePwdNotice');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  // Faculty Management DOM Elements
  const openAddFacultyModalBtn = document.getElementById('openAddFacultyModalBtn');
  const facultyModal = document.getElementById('facultyModal');
  const facultyModalTitle = document.getElementById('facultyModalTitle');
  const closeFacultyModalBtn = document.getElementById('closeFacultyModalBtn');
  const cancelFacultyBtn = document.getElementById('cancelFacultyBtn');
  const facultyForm = document.getElementById('facultyForm');
  const facultyFormId = document.getElementById('facultyFormId');
  const formFacultyId = document.getElementById('formFacultyId');
  const formFacultyName = document.getElementById('formFacultyName');
  const formFacultyEmail = document.getElementById('formFacultyEmail');
  const formFacultyPhone = document.getElementById('formFacultyPhone');
  const formFacultyDepartment = document.getElementById('formFacultyDepartment');
  const formFacultyDesignation = document.getElementById('formFacultyDesignation');
  const formFacultyRole = document.getElementById('formFacultyRole');
  const formFacultyPassword = document.getElementById('formFacultyPassword');
  const pwdReqSpan = document.getElementById('pwdReqSpan');
  const adminOnlyPwdNotice = document.getElementById('adminOnlyPwdNotice');
  const adminPwdResetGroup = document.getElementById('adminPwdResetGroup');
  const formFacultyResetPwdChance = document.getElementById('formFacultyResetPwdChance');
  const deleteSelectedFacultyBtn = document.getElementById('deleteSelectedFacultyBtn');
  const facultyGridView = document.getElementById('facultyGridView');
  const facultyTableView = document.getElementById('facultyTableView');
  const facultyTableBody = document.getElementById('facultyTableBody');
  const facultySearchInput = document.getElementById('facultySearchInput');
  const clearFacultySearchBtn = document.getElementById('clearFacultySearchBtn');
  const resetFacultySearchBtn = document.getElementById('resetFacultySearchBtn');
  const facultyDeptFilter = document.getElementById('facultyDeptFilter');
  const facultyDesignationFilter = document.getElementById('facultyDesignationFilter');
  const facultyRoleFilter = document.getElementById('facultyRoleFilter');
  const facultyGridViewBtn = document.getElementById('facultyGridViewBtn');
  const facultyTableViewBtn = document.getElementById('facultyTableViewBtn');
  const clearFacultyFiltersBtn = document.getElementById('clearFacultyFiltersBtn');
  const switchToStudentDashBtn = document.getElementById('switchToStudentDashBtn');
  const facultyEmptyState = document.getElementById('facultyEmptyState');

  // ==========================================
  // INITIALIZATION & AUTH CHECK
  // ==========================================
  if (token && currentUser) {
    showPortal();
  } else {
    showLogin();
  }

  // Password Visibility Toggle
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      if (loginPasswordInput.type === 'password') {
        loginPasswordInput.type = 'text';
        passwordEyeIcon.className = 'fa-solid fa-eye-slash';
      } else {
        loginPasswordInput.type = 'password';
        passwordEyeIcon.className = 'fa-solid fa-eye';
      }
    });
  }

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const facultyId = loginEmailInput.value.trim();
      const password = loginPasswordInput.value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facultyId, password })
        });
        const data = await res.json();

        if (data.success) {
          token = data.token;
          currentUser = data.faculty;
          sessionStorage.setItem('edupulse_token', token);
          sessionStorage.setItem('edupulse_user', JSON.stringify(currentUser));
          updateActivityTimestamp();
          showToast(`Welcome, ${currentUser.name}! Authenticated.`, 'success');
          showPortal();
        } else {
          showToast(data.message || 'Login failed', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Server connection error during login.', 'error');
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      performAutoLogout('Logged out successfully.');
    });
  }

  function showLogin() {
    stopInactivityTimer();
    loginSection.classList.remove('hidden');
    portalSection.classList.add('hidden');
    fullPageStudentView.classList.add('hidden');
  }

  function showPortal() {
    loginSection.classList.add('hidden');
    portalSection.classList.remove('hidden');
    fullPageStudentView.classList.add('hidden');

    updateActivityTimestamp();
    startInactivityTimer();

    if (currentUser) {
      facultyNameDisplay.textContent = currentUser.name;
      facultyRoleDisplay.textContent = `${currentUser.department || 'Department'} ${currentUser.designation || 'Faculty'}`;
      facultyRoleBadge.textContent = currentUser.role === 'admin' ? 'HOD / ADMIN' : 'FACULTY';
      facultyRoleBadge.className = currentUser.role === 'admin' ? 'role-badge badge-emerald' : 'role-badge badge-indigo';

      // Hide or show admin-only actions based on role
      if (currentUser.role === 'admin') {
        if (openAddModalBtn) openAddModalBtn.classList.remove('hidden');
        if (openImportModalBtn) openImportModalBtn.classList.remove('hidden');
        if (bulkDeleteFilteredBtn) bulkDeleteFilteredBtn.classList.remove('hidden');
        if (facultyDashboardBtn) facultyDashboardBtn.classList.remove('hidden');
      } else {
        if (openAddModalBtn) openAddModalBtn.classList.add('hidden');
        if (openImportModalBtn) openImportModalBtn.classList.add('hidden');
        if (bulkDeleteFilteredBtn) bulkDeleteFilteredBtn.classList.add('hidden');
        if (facultyDashboardBtn) facultyDashboardBtn.classList.add('hidden');
        if (facultyDashboardSection && !facultyDashboardSection.classList.contains('hidden')) {
          facultyDashboardSection.classList.add('hidden');
          studentDashboardSection.classList.remove('hidden');
        }
      }
    }

    fetchFilterOptionsSchema();
    updateDynamicToolbarFilters().then(() => {
      loadDashboardData();
    });
  }

  // Clean legacy localStorage auth keys
  localStorage.removeItem('edupulse_token');
  localStorage.removeItem('edupulse_user');
  localStorage.removeItem('edupulse_last_activity');

  // Initial Tab Auth Check (Requires Password on New Tab)
  if (token && currentUser) {
    const now = Date.now();
    const storedLastActivity = parseInt(sessionStorage.getItem('edupulse_last_activity') || '0', 10);
    const effective = storedLastActivity > 0 ? storedLastActivity : lastActivityTime;
    if (effective > 0 && (now - effective >= INACTIVITY_TIMEOUT_MS)) {
      performAutoLogout('Security Protocol: Automatically logged out after 3 minutes of inactivity. Password entry required.');
    } else {
      updateActivityTimestamp();
      showPortal();
    }
  } else {
    showLogin();
  }

  // ==========================================
  // DYNAMIC TOOLBAR FILTERS (PRESENT ATTRIBUTES ONLY)
  // ==========================================
  let allStudentsDataset = [];

  function getBranchLabel(val) {
    const map = {
      'CSE': 'CSE - Computer Science & Engineering',
      'CST': 'CST - Computer Science & Technology',
      'AIML': 'AIML - Artificial Intelligence & Machine Learning',
      'CAI': 'CAI - Artificial Intelligence',
      'DS': 'DS - Data Science',
      'ECE': 'ECE - Electronics & Communication',
      'ECT': 'ECT - Electronics & Computer Tech',
      'EEE': 'EEE - Electrical & Electronics',
      'MEC': 'MEC - Mechanical Engineering',
      'CIVIL': 'CIVIL - Civil Engineering',
      'IT': 'IT - Information Technology'
    };
    return map[val.toUpperCase()] || val;
  }

  function getSectionLabel(val) {
    if (/^[A-Za-z]$/.test(val)) {
      return `Section ${val.toUpperCase()}`;
    }
    return val.startsWith('Section') ? val : `Section ${val}`;
  }

  function getYearLabel(val) {
    const map = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };
    return map[val] || (val.includes('Year') ? val : `${val} Year`);
  }

  async function updateDynamicToolbarFilters() {
    try {
      const activeToken = token || sessionStorage.getItem('edupulse_token');
      if (!activeToken) return;
      const res = await fetch('/api/students/search', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        allStudentsDataset = data.students;
        populateToolbarFilterDropdowns();
      }
    } catch (err) {
      console.error('Failed to update toolbar filters:', err);
    }
  }

  function populateToolbarFilterDropdowns() {
    if (!allStudentsDataset) return;

    // 1. Branch Dropdown
    const branchesSet = new Set();
    allStudentsDataset.forEach(s => {
      if (s.branch && s.branch.trim()) branchesSet.add(s.branch.trim().toUpperCase());
    });
    const presentBranches = Array.from(branchesSet).sort();

    const selectedBranch = branchFilter ? branchFilter.value : 'ALL';
    if (branchFilter) {
      branchFilter.innerHTML = `<option value="ALL">All Branches</option>` +
        presentBranches.map(b => `<option value="${b}">${getBranchLabel(b)}</option>`).join('');
      if (presentBranches.includes(selectedBranch)) {
        branchFilter.value = selectedBranch;
      } else {
        branchFilter.value = 'ALL';
      }
    }

    const currentBranch = branchFilter ? branchFilter.value : 'ALL';

    // 2. Section Dropdown (Contextual to Selected Branch)
    let branchFiltered = allStudentsDataset;
    if (currentBranch !== 'ALL') {
      branchFiltered = allStudentsDataset.filter(s => String(s.branch).toUpperCase() === currentBranch);
    }

    const sectionsSet = new Set();
    branchFiltered.forEach(s => {
      if (s.section && s.section.trim()) sectionsSet.add(s.section.trim().toUpperCase());
    });
    const presentSections = Array.from(sectionsSet).sort();

    const selectedSection = sectionFilter ? sectionFilter.value : 'ALL';
    if (sectionFilter) {
      sectionFilter.innerHTML = `<option value="ALL">All Sections</option>` +
        presentSections.map(sec => `<option value="${sec}">${getSectionLabel(sec)}</option>`).join('');
      if (presentSections.includes(selectedSection)) {
        sectionFilter.value = selectedSection;
      } else {
        sectionFilter.value = 'ALL';
      }
    }

    const currentSection = sectionFilter ? sectionFilter.value : 'ALL';

    // 3. Year Dropdown (Contextual to Selected Branch & Section)
    let sectionFiltered = branchFiltered;
    if (currentSection !== 'ALL') {
      sectionFiltered = branchFiltered.filter(s => String(s.section).toUpperCase() === currentSection);
    }

    const yearsSet = new Set();
    sectionFiltered.forEach(s => {
      if (s.year !== undefined && s.year !== null && String(s.year).trim() !== '') {
        yearsSet.add(String(s.year).trim());
      }
    });
    const presentYears = Array.from(yearsSet).sort((a, b) => parseInt(a) - parseInt(b));

    const selectedYear = yearFilter ? yearFilter.value : 'ALL';
    if (yearFilter) {
      yearFilter.innerHTML = `<option value="ALL">All Academic Years</option>` +
        presentYears.map(y => `<option value="${y}">${getYearLabel(y)}</option>`).join('');
      if (presentYears.includes(selectedYear)) {
        yearFilter.value = selectedYear;
      } else {
        yearFilter.value = 'ALL';
      }
    }

    const currentYear = yearFilter ? yearFilter.value : 'ALL';

    // 4. Semester Dropdown (Contextual to Branch, Section & Year)
    let yearFiltered = sectionFiltered;
    if (currentYear !== 'ALL') {
      yearFiltered = sectionFiltered.filter(s => String(s.year) === currentYear);
    }

    const semSet = new Set();
    yearFiltered.forEach(s => {
      if (s.semester && s.semester.trim()) semSet.add(s.semester.trim());
    });
    const presentSemesters = Array.from(semSet).sort();

    const selectedSem = semesterFilter ? semesterFilter.value : 'ALL';
    if (semesterFilter) {
      semesterFilter.innerHTML = `<option value="ALL">All Semesters</option>` +
        presentSemesters.map(sem => `<option value="${sem}">${sem}</option>`).join('');
      if (presentSemesters.includes(selectedSem)) {
        semesterFilter.value = selectedSem;
      } else {
        semesterFilter.value = 'ALL';
      }
    }

    const currentSem = semesterFilter ? semesterFilter.value : 'ALL';

    // 5. Admission Type Dropdown (Contextual)
    let semFiltered = yearFiltered;
    if (currentSem !== 'ALL') {
      semFiltered = yearFiltered.filter(s => String(s.semester) === currentSem);
    }

    const admSet = new Set();
    semFiltered.forEach(s => {
      if (s.admissionType && s.admissionType.trim()) admSet.add(s.admissionType.trim());
    });
    const presentAdmTypes = Array.from(admSet).sort();

    const selectedAdmType = admissionTypeFilter ? admissionTypeFilter.value : 'ALL';
    if (admissionTypeFilter) {
      admissionTypeFilter.innerHTML = `<option value="ALL">All Admission Types</option>` +
        presentAdmTypes.map(t => `<option value="${t}">${t}</option>`).join('');
      if (presentAdmTypes.includes(selectedAdmType)) {
        admissionTypeFilter.value = selectedAdmType;
      } else {
        admissionTypeFilter.value = 'ALL';
      }
    }
  }

  // ==========================================
  // DASHBOARD DATA FETCHING & FILTERING
  // ==========================================
  async function loadDashboardData() {
    const params = new URLSearchParams();

    // 1. Text Query
    const q = searchInput ? searchInput.value.trim() : '';
    if (q) {
      params.append('q', q);
      if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
    } else {
      if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    }

    // 2. Toolbar drop-downs
    if (branchFilter && branchFilter.value !== 'ALL') params.append('branch', branchFilter.value);
    if (sectionFilter && sectionFilter.value !== 'ALL') params.append('section', sectionFilter.value);
    if (yearFilter && yearFilter.value !== 'ALL') params.append('year', yearFilter.value);
    if (semesterFilter && semesterFilter.value !== 'ALL') params.append('semester', semesterFilter.value);
    if (admissionTypeFilter && admissionTypeFilter.value !== 'ALL') params.append('admissionType', admissionTypeFilter.value);

    // 3. Dynamic Filter Engine Rules
    activeFilterRules.forEach(rule => {
      if (rule.type === 'categorical') {
        params.append(rule.fieldKey, rule.value);
      } else if (rule.type === 'numeric') {
        if (rule.minVal !== undefined && rule.minVal !== '') params.append(`min${capitalize(rule.fieldKey)}`, rule.minVal);
        if (rule.maxVal !== undefined && rule.maxVal !== '') params.append(`max${capitalize(rule.fieldKey)}`, rule.maxVal);
      }
    });

    try {
      const res = await fetch(`/api/students/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        currentStudents = data.students || [];
        renderStudents(currentStudents);
        updateActiveFilterBadges();
      } else {
        showToast(data.message || 'Failed to fetch student records', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server.', 'error');
    }
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // RENDER STUDENTS (GRID OR TABLE)
  function renderStudents(students) {
    // Update bulk delete count display
    if (filteredDeleteCount) {
      filteredDeleteCount.textContent = students.length;
    }

    if (!students || students.length === 0) {
      studentGridView.classList.add('hidden');
      studentTableView.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    if (currentViewMode === 'grid') {
      studentGridView.classList.remove('hidden');
      studentTableView.classList.add('hidden');
      renderGridView(students);
    } else {
      studentGridView.classList.add('hidden');
      studentTableView.classList.remove('hidden');
      renderTableView(students);
    }
  }

  function renderGridView(students) {
    studentGridView.innerHTML = students.map(s => `
      <div class="student-card" data-id="${s._id}">
        <div class="student-card-header">
          <img class="student-avatar" src="${s.photoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.name) + '&background=2563EB&color=fff'}" alt="${escapeHtml(s.name)}" onerror="this.src='https://ui-avatars.com/api/?name=Student'">
          <div class="student-card-info">
            <h3>${escapeHtml(s.name)}</h3>
            <span class="roll-badge">${escapeHtml(s.rollNumber)}</span>
          </div>
        </div>
        <div class="card-metrics-grid">
          <div class="mini-stat">
            <label>CGPA</label>
            <span>${(s.gpa || 0).toFixed(2)}</span>
          </div>
          <div class="mini-stat">
            <label>Marks %</label>
            <span>${(s.marksPercentage || ((s.gpa || 0) * 10)).toFixed(1)}%</span>
          </div>
          <div class="mini-stat">
            <label>Attendance</label>
            <span class="${(s.attendance || 0) < 75 ? 'text-rose' : 'text-emerald'}">${(s.attendance || 0).toFixed(1)}%</span>
          </div>
        </div>
        <div class="card-footer">
          <span><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(s.branch)} (Sec ${escapeHtml(s.section || 'A')})</span>
          <span class="badge badge-indigo">${escapeHtml(s.admissionType || 'Regular')}</span>
        </div>
      </div>
    `).join('');

    studentGridView.querySelectorAll('.student-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        openFullPageStudent(id);
      });
    });
  }

  function renderTableView(students) {
    studentTableBody.innerHTML = students.map(s => `
      <tr class="table-row-clickable" data-id="${s._id}">
        <td>
          <strong>${escapeHtml(s.rollNumber)}</strong><br>
          <span class="text-muted small">${escapeHtml(s.admissionNo || '-')}</span>
        </td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td><span class="badge badge-indigo">${escapeHtml(s.admissionType || 'Regular')}</span></td>
        <td><span class="badge badge-indigo">${escapeHtml(s.branch)}</span></td>
        <td>Sec ${escapeHtml(s.section || 'A')} • Year ${escapeHtml(s.year || '1')}</td>
        <td>${escapeHtml(s.semester || 'I Sem')}</td>
        <td><strong>${(s.gpa || 0).toFixed(2)}</strong></td>
        <td>${(s.marksPercentage || ((s.gpa || 0) * 10)).toFixed(1)}%</td>
        <td><span class="${(s.attendance || 0) < 75 ? 'text-rose' : 'text-emerald'} font-bold">${(s.attendance || 0).toFixed(1)}%</span></td>
        <td>${escapeHtml(s.phone || '-')}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary btn-view-row" data-id="${s._id}" title="View BIO-DATA">
            <i class="fa-solid fa-eye"></i> View
          </button>
        </td>
      </tr>
    `).join('');

    studentTableBody.querySelectorAll('.btn-view-row, tr').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.getAttribute('data-id');
        if (id) openFullPageStudent(id);
      });
    });
  }

  // ==========================================
  // BULK DELETE FILTERED STUDENTS
  // ==========================================
  if (bulkDeleteFilteredBtn) {
    bulkDeleteFilteredBtn.addEventListener('click', () => {
      if (currentStudents.length === 0) {
        showToast('No students match current filter criteria to delete.', 'info');
        return;
      }
      bulkDeleteCountDisplay.textContent = currentStudents.length;
      bulkDeleteModal.classList.remove('hidden');
    });
  }

  if (cancelBulkDeleteBtn) {
    cancelBulkDeleteBtn.addEventListener('click', () => {
      bulkDeleteModal.classList.add('hidden');
    });
  }

  if (confirmBulkDeleteBtn) {
    confirmBulkDeleteBtn.addEventListener('click', async () => {
      if (currentStudents.length === 0) return;
      confirmBulkDeleteBtn.disabled = true;
      confirmBulkDeleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting ${currentStudents.length} Records...`;

      const rollNumbers = currentStudents.map(s => s.rollNumber);

      try {
        const res = await fetch('/api/students/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rollNumbers })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message || `Deleted ${data.deletedCount} filtered student records!`, 'success');
          bulkDeleteModal.classList.add('hidden');
          updateDynamicToolbarFilters().then(() => {
            loadDashboardData();
          });
        } else {
          showToast(data.message || 'Bulk deletion failed.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error sending bulk deletion request.', 'error');
      } finally {
        confirmBulkDeleteBtn.disabled = false;
        confirmBulkDeleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Delete Filtered Students`;
      }
    });
  }

  // ==========================================
  // FULL-PAGE STUDENT BIO-DATA VIEW
  // ==========================================
  async function openFullPageStudent(id) {
    try {
      const res = await fetch(`/api/students/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!data.success || !data.student) {
        showToast('Failed to load student record', 'error');
        return;
      }

      const s = data.student;
      selectedStudentForDelete = s;

      // Populate View Fields
      fpRollHeader.textContent = s.rollNumber;
      fpPhoto.src = s.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&size=200&background=1E40AF&color=ffffff`;
      fpName.textContent = s.name;
      fpBranch.textContent = s.branch;
      fpSecYear.textContent = `Section ${s.section || 'A'} • Year ${s.year || '1'}`;
      fpSemester.textContent = s.semester || 'I Semester';
      fpGender.textContent = s.gender || 'Male';
      fpAdmissionTypeBadge.textContent = s.admissionType || 'Regular';

      fpCgpa.textContent = `${(s.gpa || 0).toFixed(2)} / 10.00`;
      fpMarksPercent.textContent = `${(s.marksPercentage || ((s.gpa || 0) * 10)).toFixed(2)}%`;
      fpAttendance.textContent = `${(s.attendance || 0).toFixed(1)}%`;

      fpRollNo.textContent = s.rollNumber;
      fpAdmissionNo.textContent = s.admissionNo || '-';
      fpAdmissionTypeDetail.innerHTML = `<span class="badge badge-indigo">${escapeHtml(s.admissionType || 'Regular')}</span>`;
      fpCourseBranch.textContent = `${s.course || 'B.Tech'} - ${s.branch}`;
      fpSecYearDetail.textContent = `Section ${s.section || 'A'}, Year ${s.year || '1'}`;
      fpSemDetail.textContent = s.semester || 'I Semester';
      fpDob.textContent = s.dob || '-';
      fpGenderReligion.textContent = `${s.gender || 'Male'}, ${s.religion || 'Hindu'}`;
      fpNationality.textContent = s.nationality || 'Indian';
      fpCet.textContent = `${s.entranceType || 'EAPCET'} - Rank ${s.cetRank || '-'}`;

      fpPhone.textContent = s.phone || '-';
      fpPersonalEmail.textContent = s.personalEmail || '-';
      fpCollegeEmail.textContent = s.collegeEmail || '-';
      fpAdhar.textContent = s.adharNo || '-';
      fpAbcId.textContent = s.abcId || '-';
      fpBankAcc.textContent = s.bankAccNo || '-';
      fpReimbursement.textContent = s.reimbursement || 'No';
      fpTransport.textContent = s.transportHalt || 'None';

      // Educational History Table
      if (s.educationDetails && s.educationDetails.length > 0) {
        fpEduTableBody.innerHTML = s.educationDetails.map(e => `
          <tr>
            <td><strong>${escapeHtml(e.qualification || '-')}</strong></td>
            <td>${escapeHtml(e.board || '-')}</td>
            <td>${escapeHtml(e.htNo || '-')}</td>
            <td>${escapeHtml(e.yearOfPass || '-')}</td>
            <td>${escapeHtml(e.institute || '-')}</td>
            <td>${escapeHtml(e.obtainedMarks || '-')}/${escapeHtml(e.maxMarks || '-')}</td>
            <td><strong>${escapeHtml(e.percentage || '-')}%</strong></td>
            <td>${escapeHtml(e.gradePoints || '-')}</td>
          </tr>
        `).join('');
      } else {
        fpEduTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No prior education records listed.</td></tr>`;
      }

      // Parents details
      const p = s.parentsDetails || {};
      fpFatherName.textContent = p.fatherName || '-';
      fpFatherOccupation.textContent = p.fatherOccupation || '-';
      fpFatherMobile.textContent = p.fatherMobile || '-';
      fpMotherName.textContent = p.motherName || '-';
      fpMotherOccupation.textContent = p.motherOccupation || '-';
      fpMotherMobile.textContent = p.motherMobile || '-';
      fpAnnualIncome.textContent = p.annualIncome ? `₹${p.annualIncome}` : '-';
      fpAddress.textContent = p.permanentAddress || p.correspondenceAddress || '-';

      if (s.remarks) {
        fpStudentRemarks.innerHTML = `<p class="fp-remarks-text">${escapeHtml(s.remarks)}</p>`;
      } else {
        fpStudentRemarks.innerHTML = `<span class="badge-no-remark"><i class="fa-solid fa-circle-info"></i> No Remark</span>`;
      }

      // Admin access controls
      if (currentUser && currentUser.role === 'admin') {
        fpActionGroup.classList.remove('hidden');
      } else {
        fpActionGroup.classList.add('hidden');
      }

      portalSection.classList.add('hidden');
      fullPageStudentView.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      showToast('Error opening student BIO-DATA.', 'error');
    }
  }

  if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener('click', () => {
      fullPageStudentView.classList.add('hidden');
      portalSection.classList.remove('hidden');
    });
  }

  if (fpEditBtn) {
    fpEditBtn.addEventListener('click', () => {
      if (selectedStudentForDelete) {
        openEditStudentModal(selectedStudentForDelete);
      }
    });
  }

  if (fpDeleteBtn) {
    fpDeleteBtn.addEventListener('click', () => {
      if (selectedStudentForDelete) {
        deleteStudentName.textContent = selectedStudentForDelete.name;
        deleteStudentRoll.textContent = selectedStudentForDelete.rollNumber;
        deleteModal.classList.remove('hidden');
      }
    });
  }

  // Single Delete handlers
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!selectedStudentForDelete) return;
      try {
        const res = await fetch(`/api/students/${selectedStudentForDelete._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          showToast('Student record deleted successfully', 'success');
          deleteModal.classList.add('hidden');
          fullPageStudentView.classList.add('hidden');
          portalSection.classList.remove('hidden');
          updateDynamicToolbarFilters().then(() => {
            loadDashboardData();
          });
        } else {
          showToast(data.message || 'Delete failed', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error deleting student record', 'error');
      }
    });
  }

  // ==========================================
  // ADD / EDIT STUDENT MODAL
  // Student Photo Upload Handling
  if (formPhotoFile) {
    formPhotoFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
          const base64Url = evt.target.result;
          if (formPhotoPreview) formPhotoPreview.src = base64Url;
          if (formPhotoUrl) formPhotoUrl.value = base64Url;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (openAddModalBtn) {
    openAddModalBtn.addEventListener('click', () => {
      studentForm.reset();
      studentFormId.value = '';
      if (formPhotoUrl) formPhotoUrl.value = '';
      if (formPhotoFile) formPhotoFile.value = '';
      formModalTitle.innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Student Record`;
      formRollNumber.disabled = false;
      formPhotoPreview.src = 'https://via.placeholder.com/60x70?text=Photo';
      formModal.classList.remove('hidden');
    });
  }

  function openEditStudentModal(s) {
    studentForm.reset();
    studentFormId.value = s._id;
    formModalTitle.innerHTML = `<i class="fa-solid fa-user-pen"></i> Edit Student BIO-DATA - ${s.rollNumber}`;
    formRollNumber.value = s.rollNumber;
    formRollNumber.disabled = true;

    formName.value = s.name || '';
    formAdmissionType.value = s.admissionType || 'Regular';
    formBranch.value = s.branch || 'CSE';
    formSection.value = s.section || 'A';
    formYear.value = s.year || '1';
    formSemester.value = s.semester || 'I Semester';
    formAdmissionNo.value = s.admissionNo || '';
    formDob.value = s.dob || '';
    formGender.value = s.gender || 'Male';
    formReligion.value = s.religion || '';
    formNationality.value = s.nationality || 'Indian';
    formEntranceType.value = s.entranceType || 'EAPCET';
    formCetRank.value = s.cetRank || '';
    formGpa.value = s.gpa || '';
    formMarksPercent.value = s.marksPercentage || '';
    formAttendance.value = s.attendance || '';
    formPhone.value = s.phone || '';
    formPersonalEmail.value = s.personalEmail || '';
    formCollegeEmail.value = s.collegeEmail || '';
    formAdhar.value = s.adharNo || '';
    formAbcId.value = s.abcId || '';
    formBankAcc.value = s.bankAccNo || '';
    formReimbursement.value = s.reimbursement || 'No';
    formTransport.value = s.transportHalt || '';
    formRemarks.value = s.remarks || '';

    const p = s.parentsDetails || {};
    formFatherName.value = p.fatherName || '';
    formFatherOccupation.value = p.fatherOccupation || '';
    formFatherMobile.value = p.fatherMobile || '';
    formMotherName.value = p.motherName || '';
    formMotherOccupation.value = p.motherOccupation || '';
    formMotherMobile.value = p.motherMobile || '';
    formAnnualIncome.value = p.annualIncome || '';
    formAddress.value = p.permanentAddress || p.correspondenceAddress || '';

    if (s.photoUrl) {
      formPhotoPreview.src = s.photoUrl;
      if (formPhotoUrl) formPhotoUrl.value = s.photoUrl;
    } else {
      formPhotoPreview.src = 'https://via.placeholder.com/60x70?text=Photo';
      if (formPhotoUrl) formPhotoUrl.value = '';
    }

    formModal.classList.remove('hidden');
  }

  // Live 10-digit numeric constraint sanitization for phone fields
  ['formPhone', 'formFatherMobile', 'formMotherMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('maxlength', '10');
      ['input', 'keyup', 'change', 'paste'].forEach(evtType => {
        el.addEventListener(evtType, (e) => {
          setTimeout(() => {
            el.value = el.value.replace(/\D/g, '').slice(0, 10);
          }, 0);
        });
      });
    }
  });

  if (closeFormModalBtn) closeFormModalBtn.addEventListener('click', () => formModal.classList.add('hidden'));
  if (cancelFormBtn) cancelFormBtn.addEventListener('click', () => formModal.classList.add('hidden'));

  // Save Student Form Submit
  if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = studentFormId.value;
      const isEdit = !!id;

      // Phone number 10-digit validation check
      const phoneVal = formPhone.value.trim();
      if (phoneVal && !/^\d{10}$/.test(phoneVal)) {
        showToast('Student Mobile / Phone number must be exactly 10 numeric digits.', 'error');
        formPhone.focus();
        return;
      }
      const fatherMobVal = formFatherMobile.value.trim();
      if (fatherMobVal && !/^\d{10}$/.test(fatherMobVal)) {
        showToast('Father Mobile number must be exactly 10 numeric digits.', 'error');
        formFatherMobile.focus();
        return;
      }
      const motherMobVal = formMotherMobile.value.trim();
      if (motherMobVal && !/^\d{10}$/.test(motherMobVal)) {
        showToast('Mother Mobile number must be exactly 10 numeric digits.', 'error');
        formMotherMobile.focus();
        return;
      }

      const payload = {
        rollNumber: formRollNumber.value.trim().toUpperCase(),
        name: formName.value.trim().toUpperCase(),
        photoUrl: (formPhotoUrl && formPhotoUrl.value) ? formPhotoUrl.value : (formPhotoPreview && !formPhotoPreview.src.includes('via.placeholder.com') ? formPhotoPreview.src : ''),
        admissionType: formAdmissionType.value,
        branch: formBranch.value,
        section: formSection.value,
        year: formYear.value,
        semester: formSemester.value,
        admissionNo: formAdmissionNo.value.trim(),
        dob: formDob.value.trim(),
        gender: formGender.value,
        religion: formReligion.value.trim(),
        nationality: formNationality.value.trim(),
        entranceType: formEntranceType.value.trim(),
        cetRank: formCetRank.value.trim(),
        gpa: parseFloat(formGpa.value) || 0,
        marksPercentage: parseFloat(formMarksPercent.value) || 0,
        attendance: parseFloat(formAttendance.value) || 0,
        phone: formPhone.value.trim(),
        personalEmail: formPersonalEmail.value.trim(),
        collegeEmail: formCollegeEmail.value.trim(),
        adharNo: formAdhar.value.trim(),
        abcId: formAbcId.value.trim(),
        bankAccNo: formBankAcc.value.trim(),
        reimbursement: formReimbursement.value,
        transportHalt: formTransport.value.trim(),
        remarks: formRemarks.value.trim(),
        parentsDetails: {
          fatherName: formFatherName.value.trim().toUpperCase(),
          fatherOccupation: formFatherOccupation.value.trim(),
          fatherMobile: formFatherMobile.value.trim(),
          motherName: formMotherName.value.trim().toUpperCase(),
          motherOccupation: formMotherOccupation.value.trim(),
          motherMobile: formMotherMobile.value.trim(),
          annualIncome: formAnnualIncome.value.trim(),
          permanentAddress: formAddress.value.trim()
        }
      };

      try {
        const url = isEdit ? `/api/students/${id}` : '/api/students';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'Student saved successfully!', 'success');
          formModal.classList.add('hidden');
          if (fullPageStudentView.classList.contains('hidden') === false && isEdit) {
            openFullPageStudent(id);
          }
          updateDynamicToolbarFilters().then(() => {
            loadDashboardData();
          });
        } else {
          showToast(data.message || 'Failed to save student record.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error communicating with server.', 'error');
      }
    });
  }

  // ==========================================
  // DYNAMIC SMART FILTER ENGINE LOGIC
  // ==========================================
  if (toggleSmartFilterBtn) {
    toggleSmartFilterBtn.addEventListener('click', () => {
      customFilterDashboardSection.classList.toggle('hidden');
    });
  }

  async function fetchFilterOptionsSchema() {
    try {
      const res = await fetch('/api/students/filter-options', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.fields) {
        filterSchemaFields = data.fields;
        renderFilterSelectDropdown(filterSchemaFields);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderFilterSelectDropdown(fields) {
    dashFilterFieldSelect.innerHTML = fields.map(f => `
      <option value="${f.key}">${f.label}</option>
    `).join('');

    if (fields.length > 0) {
      onFilterFieldSelectChange(fields[0].key);
    }
  }

  if (dashFilterFieldSelect) {
    dashFilterFieldSelect.addEventListener('change', (e) => {
      onFilterFieldSelectChange(e.target.value);
    });
  }

  function onFilterFieldSelectChange(key) {
    const fieldObj = filterSchemaFields.find(f => f.key === key);
    if (!fieldObj) return;

    if (attributeTypeBadge) {
      attributeTypeBadge.innerHTML = `<span class="badge badge-indigo"><i class="fa-solid fa-tag"></i> Type: ${fieldObj.type.toUpperCase()}</span>`;
    }

    if (fieldObj.type === 'categorical') {
      dashFilterInputContainer.innerHTML = `
        <select id="dashCategoricalValueSelect" class="filter-select-lg">
          ${(fieldObj.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
      `;
    } else {
      dashFilterInputContainer.innerHTML = `
        <div style="display:flex; gap:8px;">
          <input type="number" id="dashMinValInput" placeholder="Min (e.g. ${fieldObj.min || 0})" class="form-control" style="padding:10px; border-radius:6px;">
          <input type="number" id="dashMaxValInput" placeholder="Max (e.g. ${fieldObj.max || 100})" class="form-control" style="padding:10px; border-radius:6px;">
        </div>
      `;
    }
  }

  if (dashAddRuleBtn) {
    dashAddRuleBtn.addEventListener('click', () => {
      const fieldKey = dashFilterFieldSelect.value;
      const fieldObj = filterSchemaFields.find(f => f.key === fieldKey);
      if (!fieldObj) return;

      if (fieldObj.type === 'categorical') {
        const valSelect = document.getElementById('dashCategoricalValueSelect');
        if (!valSelect) return;
        const val = valSelect.value;
        activeFilterRules.push({
          id: Date.now(),
          fieldKey,
          label: fieldObj.label,
          type: 'categorical',
          value: val
        });
      } else {
        const minIn = document.getElementById('dashMinValInput');
        const maxIn = document.getElementById('dashMaxValInput');
        const minVal = minIn ? minIn.value : '';
        const maxVal = maxIn ? maxIn.value : '';

        if (!minVal && !maxVal) {
          showToast('Please enter Min or Max value for range rule.', 'info');
          return;
        }

        activeFilterRules.push({
          id: Date.now(),
          fieldKey,
          label: fieldObj.label,
          type: 'numeric',
          minVal,
          maxVal
        });
      }

      renderActiveRulesList();
      loadDashboardData();
    });
  }

  if (dashResetRulesBtn) {
    dashResetRulesBtn.addEventListener('click', () => {
      activeFilterRules = [];
      renderActiveRulesList();
      loadDashboardData();
    });
  }

  function renderActiveRulesList() {
    if (activeFilterRules.length === 0) {
      dashRulesList.innerHTML = `<span class="text-muted small">No custom filter rules applied. Select an attribute above and click "Apply Filter Rule".</span>`;
      return;
    }

    dashRulesList.innerHTML = activeFilterRules.map(r => {
      let desc = '';
      if (r.type === 'categorical') desc = r.value;
      else desc = `Min: ${r.minVal || 'Any'} | Max: ${r.maxVal || 'Any'}`;

      return `
        <span class="filter-pill">
          <span>${escapeHtml(r.fieldKey)}: ${escapeHtml(desc)}</span>
          <i class="fa-solid fa-xmark remove-pill" data-id="${r.id}"></i>
        </span>
      `;
    }).join('');

    dashRulesList.querySelectorAll('.remove-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.getAttribute('data-id'));
        activeFilterRules = activeFilterRules.filter(r => r.id !== id);
        renderActiveRulesList();
        loadDashboardData();
      });
    });
  }

  function updateActiveFilterBadges() {
    const hasToolbarFilters =
      (branchFilter && branchFilter.value !== 'ALL') ||
      (sectionFilter && sectionFilter.value !== 'ALL') ||
      (yearFilter && yearFilter.value !== 'ALL') ||
      (semesterFilter && semesterFilter.value !== 'ALL') ||
      (admissionTypeFilter && admissionTypeFilter.value !== 'ALL') ||
      (searchInput && searchInput.value.trim() !== '');

    const totalFilterCount = activeFilterRules.length + (hasToolbarFilters ? 1 : 0);

    if (totalFilterCount > 0) {
      if (clearAllFiltersBtn) clearAllFiltersBtn.classList.remove('hidden');
      if (activeFiltersBar) activeFiltersBar.classList.remove('hidden');

      const pills = [];
      if (branchFilter && branchFilter.value !== 'ALL') pills.push(`Branch: ${branchFilter.value}`);
      if (sectionFilter && sectionFilter.value !== 'ALL') pills.push(`Section: ${sectionFilter.value}`);
      if (yearFilter && yearFilter.value !== 'ALL') pills.push(`Year: ${yearFilter.value}`);
      if (semesterFilter && semesterFilter.value !== 'ALL') pills.push(`Sem: ${semesterFilter.value}`);
      if (admissionTypeFilter && admissionTypeFilter.value !== 'ALL') pills.push(`Admission: ${admissionTypeFilter.value}`);
      if (searchInput && searchInput.value.trim()) pills.push(`Search: "${searchInput.value.trim()}"`);

      activeFilterRules.forEach(r => {
        if (r.type === 'categorical') pills.push(`${r.fieldKey}: ${r.value}`);
        else pills.push(`${r.fieldKey}: ${r.minVal || '0'}-${r.maxVal || 'Max'}`);
      });

      filterPillsContainer.innerHTML = pills.map(p => `
        <span class="filter-pill">${escapeHtml(p)}</span>
      `).join('');

      if (activeFilterBadge) {
        activeFilterBadge.textContent = `${currentStudents.length} Filtered Results Active`;
        activeFilterBadge.className = 'perf-badge badge-emerald ml-2';
      }
    } else {
      if (clearAllFiltersBtn) clearAllFiltersBtn.classList.add('hidden');
      if (activeFiltersBar) activeFiltersBar.classList.add('hidden');
      if (activeFilterBadge) {
        activeFilterBadge.textContent = 'All Records View';
        activeFilterBadge.className = 'perf-badge ml-2';
      }
    }
  }

  // Event Listeners for Filters
  [branchFilter, sectionFilter, yearFilter, semesterFilter, admissionTypeFilter].forEach(el => {
    if (el) {
      el.addEventListener('change', () => {
        populateToolbarFilterDropdowns();
        loadDashboardData();
      });
    }
  });

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadDashboardData(), 300);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      loadDashboardData();
    });
  }

  if (clearAllFiltersBtn) clearAllFiltersBtn.addEventListener('click', resetAllFilters);
  if (clearAllFiltersBarBtn) clearAllFiltersBarBtn.addEventListener('click', resetAllFilters);
  if (resetSearchBtn) resetSearchBtn.addEventListener('click', resetAllFilters);

  function resetAllFilters() {
    if (branchFilter) branchFilter.value = 'ALL';
    if (sectionFilter) sectionFilter.value = 'ALL';
    if (yearFilter) yearFilter.value = 'ALL';
    if (semesterFilter) semesterFilter.value = 'ALL';
    if (admissionTypeFilter) admissionTypeFilter.value = 'ALL';
    if (searchInput) searchInput.value = '';
    activeFilterRules = [];
    renderActiveRulesList();
    populateToolbarFilterDropdowns();
    loadDashboardData();
  }

  // View toggle handlers
  if (gridViewBtn) {
    gridViewBtn.addEventListener('click', () => {
      currentViewMode = 'grid';
      gridViewBtn.classList.add('active');
      tableViewBtn.classList.remove('active');
      renderStudents(currentStudents);
    });
  }

  if (tableViewBtn) {
    tableViewBtn.addEventListener('click', () => {
      currentViewMode = 'table';
      tableViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
      renderStudents(currentStudents);
    });
  }



  // ==========================================
  // BULK IMPORT FULL-SCREEN MODAL
  // ==========================================
  if (openImportModalBtn) {
    openImportModalBtn.addEventListener('click', () => {
      bulkImportModal.classList.remove('hidden');
    });
  }

  // Import mode radio button selection listener
  const importModeRadios = document.querySelectorAll('input[name="importModeRadio"]');
  importModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('active'));
      const parentCard = radio.closest('.mode-card');
      if (parentCard) parentCard.classList.add('active');

      const currentModeBadge = document.getElementById('currentModeBadge');
      if (currentModeBadge) {
        if (radio.value === 'UPDATE') currentModeBadge.textContent = 'Mode: UPDATE ONLY';
        else if (radio.value === 'ADD') currentModeBadge.textContent = 'Mode: ADD NEW ONLY';
        else currentModeBadge.textContent = 'Mode: SMART MERGE (ADD & UPDATE)';
      }
    });
  });

  if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', () => bulkImportModal.classList.add('hidden'));
  if (closeImportModalFooterBtn) closeImportModalFooterBtn.addEventListener('click', () => bulkImportModal.classList.add('hidden'));

  // Drag & drop dropzone
  if (importDropzone) {
    importDropzone.addEventListener('click', (e) => {
      if (e.target !== browseFileLink) importFileInput.click();
    });
    importDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      importDropzone.classList.add('dragover');
    });
    importDropzone.addEventListener('dragleave', () => importDropzone.classList.remove('dragover'));
    importDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      importDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  if (removeSelectedFileBtn) {
    removeSelectedFileBtn.addEventListener('click', () => {
      resetImportModalState();
    });
  }

  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', () => {
      const sampleData = [
        {
          "Roll Number": "23A81A0415",
          "Student Name": "KUMAR SWAMY",
          "Admission Number": "095/ECE/2023",
          "Admission Type": "Regular",
          "Branch": "ECE",
          "Section": "E",
          "Academic Year": "2",
          "Semester": "III Semester",
          "Date of Birth": "15/01/2005",
          "Gender": "Male",
          "Religion": "Hindu",
          "Nationality": "Indian",
          "Entrance Type": "EAPCET",
          "CET Rank": 31200,
          "Mobile": "9876500111",
          "Personal Email": "kumar.s@gmail.com",
          "College Email": "23a81a0415@sves.org.in",
          "Aadhar Number": "892192097777",
          "ABC ID": "255692430001",
          "Bank Account No": "061010023000777",
          "Fee Reimbursement": "No",
          "Transport Halt": "TANUKU",
          "CGPA": 8.45,
          "Attendance %": 88.5,
          "Marks Percentage": 84.5,
          "Father Name": "SATYANARAYANA",
          "Father Occupation": "FARMER",
          "Father Mobile": "9876599111",
          "Mother Name": "LAKSHMI",
          "Mother Occupation": "HOUSEWIFE",
          "Mother Mobile": "9876588111",
          "Parents Annual Income": 120000,
          "Permanent Address": "TANUKU WEST GODAVARI AP"
        },
        {
          "Roll Number": "23A81A0501",
          "Student Name": "PRIYA SHARMA",
          "Admission Number": "102/CST/2023",
          "Admission Type": "Regular",
          "Branch": "CST",
          "Section": "A",
          "Academic Year": "3",
          "Semester": "V Semester",
          "Date of Birth": "25/08/2004",
          "Gender": "Female",
          "Religion": "Hindu",
          "Nationality": "Indian",
          "Entrance Type": "EAPCET",
          "CET Rank": 12500,
          "Mobile": "9876500222",
          "Personal Email": "",
          "College Email": "23a81a0501@sves.org.in",
          "Aadhar Number": "",
          "ABC ID": "",
          "Bank Account No": "",
          "Fee Reimbursement": "Yes",
          "Transport Halt": "ELURU",
          "CGPA": 9.10,
          "Attendance %": 94.0,
          "Marks Percentage": 91.0,
          "Father Name": "RAMESH SHARMA",
          "Father Occupation": "",
          "Father Mobile": "9876599222",
          "Mother Name": "SUNITA SHARMA",
          "Mother Occupation": "",
          "Mother Mobile": "9876588222",
          "Parents Annual Income": 250000,
          "Permanent Address": "ELURU WEST GODAVARI AP"
        }
      ];

      if (typeof XLSX !== 'undefined') {
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student Import Sample");
        XLSX.writeFile(workbook, "Student_Import_Template.xlsx");
        showToast('Sample Excel template (.xlsx) downloaded successfully!', 'success');
      } else {
        const headers = Object.keys(sampleData[0]).join(',');
        const rows = sampleData.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Student_Import_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Sample CSV template downloaded!', 'success');
      }
    });
  }

  function extractRollNumberFromRow(rowObj) {
    if (!rowObj || typeof rowObj !== 'object') return '';

    const directKeys = [
      'Roll Number', 'rollNumber', 'Roll No', 'rollNo', 'ROLL NO', 'Roll',
      'roll_number', 'roll_no', 'ht_no', 'hallticket_no', 'student_roll', 'studentRoll'
    ];
    for (let k of directKeys) {
      if (rowObj[k] !== undefined && rowObj[k] !== null) {
        const val = String(rowObj[k]).trim();
        if (val) return val;
      }
    }

    for (let k of Object.keys(rowObj)) {
      const normK = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (['rollnumber', 'rollno', 'roll', 'htno', 'hallticketno', 'studentroll'].includes(normK)) {
        const val = String(rowObj[k]).trim();
        if (val) return val;
      }
    }

    return '';
  }

  function findRowValue(rowObj, candidates, defaultVal = '-') {
    if (!rowObj || typeof rowObj !== 'object') return defaultVal;
    for (let candidate of candidates) {
      if (rowObj[candidate] !== undefined && rowObj[candidate] !== null) {
        const str = String(rowObj[candidate]).trim();
        if (str !== '') return str;
      }
    }
    const candNorms = candidates.map(c => String(c).toLowerCase().replace(/[^a-z0-9%]/g, ''));
    for (let k of Object.keys(rowObj)) {
      const normK = String(k).toLowerCase().replace(/[^a-z0-9%]/g, '');
      if (candNorms.includes(normK)) {
        const str = String(rowObj[k]).trim();
        if (str !== '') return str;
      }
    }
    return defaultVal;
  }

  function handleFileSelection(file) {
    if (!file) return;
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      showToast('Invalid file format. Please upload a .csv, .xlsx, or .xls file.', 'error');
      return;
    }

    selectedFileName.textContent = fileName;
    selectedFileInfo.classList.remove('hidden');
    importDropzone.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (typeof XLSX !== 'undefined') {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          parsedBulkStudents = [];
          rawJson.forEach(row => {
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              const trimmedKey = key.trim();
              normalizedRow[trimmedKey] = row[key];
              normalizedRow[key] = row[key];
            });
            const rollNo = extractRollNumberFromRow(normalizedRow);
            if (rollNo) {
              normalizedRow.rollNumber = rollNo;
              parsedBulkStudents.push(normalizedRow);
            }
          });

          if (parsedBulkStudents.length === 0) {
            showToast('No valid student roll numbers found in uploaded file.', 'error');
            submitBulkImportBtn.disabled = true;
            return;
          }

          renderPreviewTable(parsedBulkStudents);
          submitBulkImportBtn.disabled = false;
          submitBulkImportBtn.innerHTML = `<i class="fa-solid fa-play"></i> Process Bulk Import / Update`;
          showToast(`Detected ${parsedBulkStudents.length} student rows ready for processing.`, 'success');
        } else {
          const text = new TextDecoder().decode(e.target.result);
          parseCSVText(text);
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to parse uploaded Excel file. Please ensure it is a valid format.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function parseCSVText(csvText) {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      showToast('CSV file is empty or missing data rows.', 'error');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    parsedBulkStudents = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      if (row.length === 0) continue;

      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] ? row[idx].trim() : '';
      });

      const rollNo = extractRollNumberFromRow(obj);
      if (rollNo) {
        obj.rollNumber = rollNo;
        parsedBulkStudents.push(obj);
      }
    }

    if (parsedBulkStudents.length === 0) {
      showToast('No valid student roll numbers found in uploaded file.', 'error');
      submitBulkImportBtn.disabled = true;
      return;
    }

    renderPreviewTable(parsedBulkStudents);
    submitBulkImportBtn.disabled = false;
    submitBulkImportBtn.innerHTML = `<i class="fa-solid fa-play"></i> Process Bulk Import / Update`;
    showToast(`Detected ${parsedBulkStudents.length} student rows ready for processing.`, 'success');
  }

  function parseCSVRow(rowStr) {
    const arr = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < rowStr.length; i++) {
      const c = rowStr[i];
      if (c === '"') {
        insideQuote = !insideQuote;
      } else if (c === ',' && !insideQuote) {
        arr.push(entry.replace(/^"|"$/g, ''));
        entry = '';
      } else {
        entry += c;
      }
    }
    arr.push(entry.replace(/^"|"$/g, ''));
    return arr;
  }

  function renderPreviewTable(rows) {
    parsedRowCount.textContent = rows.length;
    importPreviewContainer.classList.remove('hidden');

    const previewRows = rows.slice(0, 5);
    importPreviewTbody.innerHTML = previewRows.map(r => `
      <tr>
        <td><strong>${escapeHtml(r.rollNumber || '-')}</strong></td>
        <td>${escapeHtml(findRowValue(r, ['Name', 'Student Name', 'name', 'student_name']))}</td>
        <td><span class="badge badge-indigo">${escapeHtml(findRowValue(r, ['Branch', 'branch', 'Department', 'department']))}</span></td>
        <td>${escapeHtml(findRowValue(r, ['Semester', 'semester', 'sem']))}</td>
        <td><strong class="text-emerald">${escapeHtml(findRowValue(r, ['Attendance %', 'Attendance', 'attendance', 'attendance_percent'], '85.0'))}%</strong></td>
        <td><strong class="text-indigo">${escapeHtml(findRowValue(r, ['CGPA', 'GPA', 'gpa', 'cgpa'], '8.0'))}</strong></td>
        <td>₹${escapeHtml(findRowValue(r, ['Parents Annual Income', 'Annual Income', 'annualIncome', 'annual_income'], '150,000'))}</td>
      </tr>
    `).join('');
  }

  function resetImportModalState() {
    parsedBulkStudents = [];
    if (importFileInput) importFileInput.value = '';
    selectedFileInfo.classList.add('hidden');
    importDropzone.classList.remove('hidden');
    importPreviewContainer.classList.add('hidden');
    importReportCard.classList.add('hidden');
    submitBulkImportBtn.disabled = true;
    submitBulkImportBtn.innerHTML = `<i class="fa-solid fa-play"></i> Process Bulk Import / Update`;
  }

  function getSelectedImportMode() {
    const radios = document.getElementsByName('importModeRadio');
    for (let r of radios) {
      if (r.checked) return r.value;
    }
    return 'BOTH';
  }

  if (submitBulkImportBtn) {
    submitBulkImportBtn.addEventListener('click', async () => {
      if (parsedBulkStudents.length === 0) return;
      const mode = getSelectedImportMode();

      submitBulkImportBtn.disabled = true;
      submitBulkImportBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing ${parsedBulkStudents.length} Records...`;

      try {
        const authToken = token || sessionStorage.getItem('edupulse_token') || '';
        const response = await fetch('/api/students/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            mode,
            students: parsedBulkStudents
          })
        });

        const data = await response.json();
        if (data.success) {
          showToast(data.message || 'Bulk processing completed successfully!', 'success');
          renderImportReport(data.summary);
          updateDynamicToolbarFilters().then(() => {
            loadDashboardData();
          });
        } else {
          showToast(data.message || 'Bulk import failed.', 'error');
          submitBulkImportBtn.disabled = false;
          submitBulkImportBtn.innerHTML = `<i class="fa-solid fa-play"></i> Retry Bulk Import / Update`;
        }
      } catch (err) {
        console.error(err);
        showToast('Error executing bulk import endpoint.', 'error');
        submitBulkImportBtn.disabled = false;
        submitBulkImportBtn.innerHTML = `<i class="fa-solid fa-play"></i> Retry Bulk Import / Update`;
      }
    });
  }

  function renderImportReport(summary) {
    if (!summary) return;
    importReportCard.classList.remove('hidden');
    document.getElementById('reportTotal').textContent = summary.totalReceived || 0;
    document.getElementById('reportAdded').textContent = summary.insertedCount || 0;
    document.getElementById('reportUpdated').textContent = summary.updatedCount || 0;
    document.getElementById('reportSkipped').textContent = summary.skippedCount || 0;

    const notice = document.getElementById('skippedRollsNotice');
    const list = document.getElementById('skippedRollsList');
    if (summary.skippedRollNumbers && summary.skippedRollNumbers.length > 0) {
      if (notice && list) {
        list.textContent = summary.skippedRollNumbers.join(', ');
        notice.classList.remove('hidden');
      }
    } else if (notice) {
      notice.classList.add('hidden');
    }

    submitBulkImportBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Bulk Import Complete!`;
    importReportCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', () => {
      const sampleCSV = `Roll Number,Student Name,Admission Type,Branch,Section,Year,Semester,Attendance %,CGPA,Parents Annual Income
24A81A0629,KORLEPARA SHANMUKHA VENKATA ARUN KUMAR,Regular,CST,A,3,V Semester,94.8,9.14,70000
24A81A0601,ANANYA SHARMA,Regular,CST,A,3,V Semester,96.2,9.40,120000
23A81A0412,ROHAN DESHMUKH,Lateral Entry,ECE,B,2,III Semester,82.5,8.25,50000`;

      const blob = new Blob([sampleCSV], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_student_import_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  // ==========================================
  // UTILITY TOAST NOTIFICATIONS & SANITIZE
  // ==========================================
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // FACULTY DASHBOARD & ROLE-BASED PROFILE SYSTEM
  // ==========================================
  let currentFacultyList = [];
  let allFacultyDataset = [];
  let currentFacultyViewMode = 'table';
  let editingFacultyId = null;
  let selectedFacultyIds = new Set();

  // View Switchers
  if (facultyDashboardBtn) {
    facultyDashboardBtn.addEventListener('click', () => {
      studentDashboardSection.classList.add('hidden');
      facultyDashboardSection.classList.remove('hidden');
      fetchFacultyData();
    });
  }

  if (switchToStudentDashBtn) {
    switchToStudentDashBtn.addEventListener('click', () => {
      facultyDashboardSection.classList.add('hidden');
      studentDashboardSection.classList.remove('hidden');
      loadDashboardData();
    });
  }

  // Faculty Table / Grid View Toggle Event Listeners
  if (facultyTableViewBtn) {
    facultyTableViewBtn.addEventListener('click', () => {
      currentFacultyViewMode = 'table';
      facultyTableViewBtn.classList.add('active');
      facultyTableViewBtn.style.background = 'var(--bg-card)';
      facultyTableViewBtn.style.color = 'var(--indigo)';
      if (facultyGridViewBtn) {
        facultyGridViewBtn.classList.remove('active');
        facultyGridViewBtn.style.background = 'transparent';
        facultyGridViewBtn.style.color = 'var(--text-muted)';
      }
      renderFacultyView();
    });
  }

  if (facultyGridViewBtn) {
    facultyGridViewBtn.addEventListener('click', () => {
      currentFacultyViewMode = 'grid';
      facultyGridViewBtn.classList.add('active');
      facultyGridViewBtn.style.background = 'var(--bg-card)';
      facultyGridViewBtn.style.color = 'var(--indigo)';
      if (facultyTableViewBtn) {
        facultyTableViewBtn.classList.remove('active');
        facultyTableViewBtn.style.background = 'transparent';
        facultyTableViewBtn.style.color = 'var(--text-muted)';
      }
      renderFacultyView();
    });
  }

  // Dynamic Department & Designation Filter Population
  function updateFacultyFilterDropdowns() {
    if (allFacultyDataset.length === 0 && currentFacultyList.length > 0) {
      allFacultyDataset = [...currentFacultyList];
    }
    const datasetToUse = allFacultyDataset.length > 0 ? allFacultyDataset : currentFacultyList;

    // Collect present departments
    const deptSet = new Set();
    datasetToUse.forEach(f => {
      if (f.department && f.department.trim()) deptSet.add(f.department.trim());
    });
    const presentDepts = Array.from(deptSet).sort();

    // Collect present designations
    const desigSet = new Set();
    datasetToUse.forEach(f => {
      if (f.designation && f.designation.trim()) desigSet.add(f.designation.trim());
    });
    const presentDesigs = Array.from(desigSet).sort();

    // Update Department Filter
    const selDept = facultyDeptFilter ? facultyDeptFilter.value : 'ALL';
    if (facultyDeptFilter) {
      facultyDeptFilter.innerHTML = '<option value="ALL">All Departments</option>' +
        presentDepts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
      if (presentDepts.includes(selDept)) {
        facultyDeptFilter.value = selDept;
      } else {
        facultyDeptFilter.value = 'ALL';
      }
    }

    // Update Designation Filter
    const selDesig = facultyDesignationFilter ? facultyDesignationFilter.value : 'ALL';
    if (facultyDesignationFilter) {
      facultyDesignationFilter.innerHTML = '<option value="ALL">All Designations</option>' +
        presentDesigs.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
      if (presentDesigs.includes(selDesig)) {
        facultyDesignationFilter.value = selDesig;
      } else {
        facultyDesignationFilter.value = 'ALL';
      }
    }
  }

  // Fetch Faculty List
  async function fetchFacultyData() {
    try {
      const dept = facultyDeptFilter ? facultyDeptFilter.value : 'ALL';
      const desig = facultyDesignationFilter ? facultyDesignationFilter.value : 'ALL';
      const q = facultySearchInput ? facultySearchInput.value.trim() : '';

      const queryParams = new URLSearchParams();
      if (dept !== 'ALL') queryParams.append('department', dept);
      if (desig !== 'ALL') queryParams.append('designation', desig);
      if (q) queryParams.append('q', q);

      const res = await fetch(`/api/faculty?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        currentFacultyList = data.faculty || [];
        if (!dept && !desig && !q) {
          allFacultyDataset = [...currentFacultyList];
        }
        updateFacultyFilterDropdowns();
        renderFacultyView();
      } else {
        showToast(data.message || 'Failed to fetch faculty records.', 'error');
      }
    } catch (err) {
      console.error('Error fetching faculty data:', err);
      showToast('Error connecting to faculty server API.', 'error');
    }
  }

  // Render Faculty Main View (Table or Grid)
  function renderFacultyView() {
    if (currentFacultyList.length === 0) {
      if (facultyTableView) facultyTableView.classList.add('hidden');
      if (facultyGridView) facultyGridView.classList.add('hidden');
      if (facultyEmptyState) facultyEmptyState.classList.remove('hidden');
      return;
    }

    if (facultyEmptyState) facultyEmptyState.classList.add('hidden');

    if (currentFacultyViewMode === 'table') {
      if (facultyGridView) facultyGridView.classList.add('hidden');
      if (facultyTableView) facultyTableView.classList.remove('hidden');
      renderFacultyTable();
    } else {
      if (facultyTableView) facultyTableView.classList.add('hidden');
      if (facultyGridView) facultyGridView.classList.remove('hidden');
      renderFacultyGrid();
    }
  }

  // Render Faculty Table
  function renderFacultyTable() {
    if (!facultyTableBody) return;
    facultyTableBody.innerHTML = '';

    const isAdmin = currentUser && currentUser.role === 'admin';

    currentFacultyList.forEach(fac => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(fac.facultyId)}</strong></td>
        <td>
          <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(fac.name)}</div>
        </td>
        <td>${escapeHtml(fac.email || 'N/A')}</td>
        <td>${escapeHtml(fac.phoneNumber || 'N/A')}</td>
        <td><span class="badge badge-indigo">${escapeHtml(fac.department || 'N/A')}</span></td>
        <td><span class="badge badge-purple">${escapeHtml(fac.designation || 'N/A')}</span></td>
        <td>
          <span class="badge ${fac.role === 'admin' ? 'badge-rose' : 'badge-emerald'}">
            ${fac.role === 'admin' ? 'Admin' : 'Faculty'}
          </span>
        </td>
        <td>
          <div class="action-btn-group">
            <button class="btn-icon btn-edit-fac" data-id="${fac._id || fac.facultyId}" title="View & Edit Faculty Details">
              <i class="fa-solid fa-pen-to-square text-indigo"></i>
            </button>
            ${isAdmin ? `
            <button class="btn-icon btn-delete-fac" data-id="${fac._id || fac.facultyId}" data-name="${escapeHtml(fac.name)}" title="Delete Faculty Member">
              <i class="fa-solid fa-trash-can text-rose"></i>
            </button>` : ''}
          </div>
        </td>
      `;
      facultyTableBody.appendChild(tr);
    });

    attachFacultyActionEvents(facultyTableBody);
  }

  // Render Faculty Grid Cards
  function renderFacultyGrid() {
    if (!facultyGridView) return;
    facultyGridView.innerHTML = '';

    const isAdmin = currentUser && currentUser.role === 'admin';

    currentFacultyList.forEach(fac => {
      const card = document.createElement('div');
      card.className = 'faculty-card';

      const initials = (fac.name || 'F')
        .split(' ')
        .filter(n => n.length > 0 && !['Dr.', 'Prof.', 'Mr.', 'Mrs.', 'Ms.'].includes(n))
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'F';

      const pwdStatusBadge = fac.role === 'admin'
        ? '<span class="badge badge-emerald" style="font-size: 0.7rem;"><i class="fa-solid fa-user-shield"></i> Admin Access</span>'
        : (fac.hasChangedPassword
          ? '<span class="badge badge-rose" style="font-size: 0.7rem;"><i class="fa-solid fa-lock"></i> Password Changed</span>'
          : '<span class="badge badge-amber" style="font-size: 0.7rem;"><i class="fa-solid fa-bolt"></i> ⚡ 1-Time Change Available</span>');

      card.innerHTML = `
        <div class="faculty-card-header">
          <div class="faculty-avatar-circle">${escapeHtml(initials)}</div>
          <div class="faculty-card-info">
            <h4>${escapeHtml(fac.name)}</h4>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
              <span class="badge badge-indigo" style="font-size: 0.75rem;">${escapeHtml(fac.facultyId)}</span>
              <span class="badge ${fac.role === 'admin' ? 'badge-rose' : 'badge-emerald'}" style="font-size: 0.75rem;">
                ${fac.role === 'admin' ? 'Admin' : 'Faculty'}
              </span>
              ${pwdStatusBadge}
            </div>
          </div>
        </div>

        <div class="faculty-card-details">
          <div><i class="fa-solid fa-building-user text-indigo" style="width: 18px;"></i> <strong>Dept:</strong> ${escapeHtml(fac.department || 'N/A')}</div>
          <div><i class="fa-solid fa-user-tie text-purple" style="width: 18px;"></i> <strong>Desig:</strong> ${escapeHtml(fac.designation || 'N/A')}</div>
          <div><i class="fa-solid fa-envelope text-primary" style="width: 18px;"></i> <strong>Email:</strong> ${escapeHtml(fac.email || 'N/A')}</div>
          <div><i class="fa-solid fa-phone text-emerald" style="width: 18px;"></i> <strong>Phone:</strong> ${escapeHtml(fac.phoneNumber || 'N/A')}</div>
        </div>

        <div class="faculty-card-actions">
          <button class="btn btn-outline btn-sm btn-edit-fac" data-id="${fac._id || fac.facultyId}">
            <i class="fa-solid fa-pen-to-square text-indigo"></i> Edit
          </button>
          ${isAdmin ? `
          <button class="btn btn-outline-danger btn-sm btn-delete-fac" data-id="${fac._id || fac.facultyId}" data-name="${escapeHtml(fac.name)}">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>` : ''}
        </div>
      `;
      facultyGridView.appendChild(card);
    });

    attachFacultyActionEvents(facultyGridView);
  }

  // Action Events for Faculty items
  function attachFacultyActionEvents(container) {
    container.querySelectorAll('.btn-edit-fac').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openEditFacultyModal(id);
      });
    });

    container.querySelectorAll('.btn-delete-fac').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const name = e.currentTarget.getAttribute('data-name');
        handleSingleDeleteFaculty(id, name);
      });
    });
  }

  // Filters & Search Event Listeners
  if (facultyDeptFilter) facultyDeptFilter.addEventListener('change', fetchFacultyData);
  if (facultyDesignationFilter) facultyDesignationFilter.addEventListener('change', fetchFacultyData);

  if (facultySearchInput) {
    facultySearchInput.addEventListener('input', () => {
      if (facultySearchInput.value.trim()) {
        clearFacultySearchBtn.classList.remove('hidden');
      } else {
        clearFacultySearchBtn.classList.add('hidden');
      }
      fetchFacultyData();
    });
  }

  if (clearFacultySearchBtn) {
    clearFacultySearchBtn.addEventListener('click', () => {
      facultySearchInput.value = '';
      clearFacultySearchBtn.classList.add('hidden');
      fetchFacultyData();
    });
  }

  if (resetFacultySearchBtn) {
    resetFacultySearchBtn.addEventListener('click', () => {
      if (facultySearchInput) facultySearchInput.value = '';
      if (facultyDeptFilter) facultyDeptFilter.value = 'ALL';
      if (facultyDesignationFilter) facultyDesignationFilter.value = 'ALL';
      if (clearFacultySearchBtn) clearFacultySearchBtn.classList.add('hidden');
      fetchFacultyData();
    });
  }

  // Add Faculty Modal Open
  if (openAddFacultyModalBtn) {
    openAddFacultyModalBtn.addEventListener('click', () => {
      if (!currentUser || currentUser.role !== 'admin') {
        showToast('Only Admin users are permitted to add new faculty members.', 'error');
        return;
      }
      editingFacultyId = null;
      facultyForm.reset();
      facultyFormId.value = '';
      facultyModalTitle.innerHTML = '<i class="fa-solid fa-user-plus text-emerald"></i> Add Faculty Member';

      formFacultyId.disabled = false;
      formFacultyId.readOnly = false;
      formFacultyId.style.opacity = '1';
      formFacultyId.style.cursor = 'text';

      formFacultyPassword.disabled = false;
      formFacultyPassword.required = true;
      pwdReqSpan.classList.remove('hidden');
      adminOnlyPwdNotice.classList.add('hidden');
      if (adminPwdResetGroup) adminPwdResetGroup.classList.add('hidden');
      if (formFacultyResetPwdChance) formFacultyResetPwdChance.checked = false;

      facultyModal.classList.remove('hidden');
    });
  }

  // Edit Faculty Modal Open
  function openEditFacultyModal(id) {
    const fac = currentFacultyList.find(f => f._id === id || f.facultyId === id);
    if (!fac) return;

    editingFacultyId = id;
    facultyForm.reset();
    facultyFormId.value = fac._id || fac.facultyId;
    formFacultyId.value = fac.facultyId;
    formFacultyId.disabled = true;
    formFacultyId.readOnly = true;
    formFacultyId.style.opacity = '0.7';
    formFacultyId.style.cursor = 'not-allowed';

    formFacultyName.value = fac.name;
    formFacultyEmail.value = fac.email || '';
    formFacultyPhone.value = fac.phoneNumber || '';
    formFacultyDepartment.value = fac.department || 'Computer Science & Engineering';
    formFacultyDesignation.value = fac.designation || 'Associate Professor';
    formFacultyRole.value = fac.role || 'faculty';
    formFacultyPassword.value = '';

    facultyModalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo"></i> Edit Faculty Details: ${escapeHtml(fac.name)}`;

    const isAdmin = currentUser && currentUser.role === 'admin';
    if (isAdmin) {
      formFacultyPassword.disabled = false;
      formFacultyPassword.required = false;
      pwdReqSpan.classList.add('hidden');
      adminOnlyPwdNotice.classList.add('hidden');
      if (adminPwdResetGroup) adminPwdResetGroup.classList.remove('hidden');
      if (formFacultyResetPwdChance) formFacultyResetPwdChance.checked = !fac.hasChangedPassword;
    } else {
      // Non-admin faculty viewing/editing: password field locked
      formFacultyPassword.disabled = true;
      formFacultyPassword.required = false;
      pwdReqSpan.classList.add('hidden');
      adminOnlyPwdNotice.classList.remove('hidden');
      if (adminPwdResetGroup) adminPwdResetGroup.classList.add('hidden');
    }

    facultyModal.classList.remove('hidden');
  }

  // Close Faculty Modal
  if (closeFacultyModalBtn) closeFacultyModalBtn.addEventListener('click', () => facultyModal.classList.add('hidden'));
  if (cancelFacultyBtn) cancelFacultyBtn.addEventListener('click', () => facultyModal.classList.add('hidden'));

  // Save Faculty Form Submission
  if (facultyForm) {
    facultyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        facultyId: formFacultyId.value.trim().toUpperCase(),
        name: formFacultyName.value.trim(),
        email: formFacultyEmail.value.trim(),
        phoneNumber: formFacultyPhone.value.trim(),
        department: formFacultyDepartment.value,
        designation: formFacultyDesignation.value,
        role: formFacultyRole.value
      };

      if (formFacultyPassword.value.trim()) {
        payload.password = formFacultyPassword.value.trim();
      }

      if (currentUser && currentUser.role === 'admin' && adminPwdResetGroup && !adminPwdResetGroup.classList.contains('hidden') && formFacultyResetPwdChance) {
        payload.hasChangedPassword = !formFacultyResetPwdChance.checked;
      }

      try {
        const isEdit = !!editingFacultyId;
        const url = isEdit ? `/api/faculty/${editingFacultyId}` : '/api/faculty';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          facultyModal.classList.add('hidden');
          fetchFacultyData();
        } else {
          showToast(data.message || 'Operation failed.', 'error');
        }
      } catch (err) {
        console.error('Error saving faculty:', err);
        showToast('Server connection error while saving faculty record.', 'error');
      }
    });
  }

  // Single Delete Faculty
  async function handleSingleDeleteFaculty(id, name) {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Only Admin users have permission to delete faculty records.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete faculty member '${name}'? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/faculty/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        fetchFacultyData();
      } else {
        showToast(data.message || 'Delete operation failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error executing delete.', 'error');
    }
  }

  // Bulk Delete Faculty
  if (deleteSelectedFacultyBtn) {
    deleteSelectedFacultyBtn.addEventListener('click', async () => {
      if (!currentUser || currentUser.role !== 'admin') {
        showToast('Only Admin users have permission to delete faculty records.', 'error');
        return;
      }

      const ids = Array.from(selectedFacultyIds);
      if (ids.length === 0) return;

      if (!confirm(`Are you sure you want to delete ${ids.length} selected faculty member(s)?`)) {
        return;
      }

      try {
        const res = await fetch('/api/faculty/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ facultyIds: ids })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          fetchFacultyData();
        } else {
          showToast(data.message || 'Bulk delete failed.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Server error during bulk delete.', 'error');
      }
    });
  }

  // ==========================================
  // UNIFIED MULTI-FORMAT CUSTOM FIELD EXPORT ENGINE (EXCEL, CSV, PDF)
  // ==========================================
  let activeExportTarget = 'students';

  const fieldLabelMap = {
    rollNumber: 'Roll Number',
    name: 'Student Name',
    admissionNo: 'Admission Number',
    admissionType: 'Admission Type',
    course: 'Course',
    branch: 'Branch',
    section: 'Section',
    year: 'Academic Year',
    semester: 'Semester',
    gpa: 'CGPA',
    marksPercentage: 'Marks Percentage',
    attendance: 'Attendance %',
    entranceType: 'Entrance Type',
    cetRank: 'CET Rank',
    seatCategory: 'Seat Category',
    phone: 'Phone / Mobile',
    personalEmail: 'Personal Email',
    collegeEmail: 'College Email',
    dob: 'Date of Birth',
    gender: 'Gender',
    religion: 'Religion',
    nationality: 'Nationality',
    adharNo: 'Aadhar Number',
    abcId: 'ABC ID',
    bankAccNo: 'Bank Account No',
    reimbursement: 'Fee Reimbursement',
    transportHalt: 'Transport Halt',
    fatherName: 'Father Name',
    fatherOccupation: 'Father Occupation',
    fatherMobile: 'Father Mobile',
    motherName: 'Mother Name',
    motherOccupation: 'Mother Occupation',
    motherMobile: 'Mother Mobile',
    annualIncome: 'Parents Annual Income',
    permanentAddress: 'Address',
    remarks: 'Faculty Remarks'
  };

  function updateExcelSelectedCount() {
    if (!excelFieldGrid || !excelSelectedCount) return;
    const checked = excelFieldGrid.querySelectorAll('input[name="excelField"]:checked').length;
    excelSelectedCount.textContent = checked;
  }

  if (excelFieldGrid) {
    excelFieldGrid.addEventListener('change', updateExcelSelectedCount);
  }

  if (closeExcelExportModalBtn) {
    closeExcelExportModalBtn.addEventListener('click', () => {
      if (excelExportModal) excelExportModal.classList.add('hidden');
    });
  }

  if (cancelExcelExportBtn) {
    cancelExcelExportBtn.addEventListener('click', () => {
      if (excelExportModal) excelExportModal.classList.add('hidden');
    });
  }

  if (excelSelectAllBtn) {
    excelSelectAllBtn.addEventListener('click', () => {
      if (!excelFieldGrid) return;
      excelFieldGrid.querySelectorAll('input[name="excelField"]').forEach(cb => cb.checked = true);
      updateExcelSelectedCount();
    });
  }

  if (excelDeselectAllBtn) {
    excelDeselectAllBtn.addEventListener('click', () => {
      if (!excelFieldGrid) return;
      excelFieldGrid.querySelectorAll('input[name="excelField"]').forEach(cb => cb.checked = false);
      updateExcelSelectedCount();
    });
  }

  if (excelSelectDefaultBtn) {
    excelSelectDefaultBtn.addEventListener('click', () => {
      renderExportModalFields(activeExportTarget);
    });
  }

  function renderExportModalFields(target) {
    if (!excelFieldGrid) return;
    excelFieldGrid.innerHTML = '';

    if (target === 'faculty') {
      excelFieldGrid.innerHTML = `
        <div class="field-category-title" style="grid-column: 1 / -1; font-weight: 700; color: var(--indigo); font-size: 0.95rem; margin-top: 4px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
          <i class="fa-solid fa-chalkboard-user"></i> Faculty Member Attributes
        </div>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="facultyId" checked> Faculty ID</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="name" checked> Full Name</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="email" checked> Email Address</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="phoneNumber" checked> Phone Number</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="department" checked> Department</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="designation" checked> Designation</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="role" checked> System Role</label>
      `;
    } else {
      excelFieldGrid.innerHTML = `
        <!-- Category 1: Academic & Identifier -->
        <div class="field-category-title">
          <i class="fa-solid fa-graduation-cap"></i> Academic & Identifiers
        </div>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="rollNumber" checked> Roll Number</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="name" checked> Student Name</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="admissionNo" checked> Admission Number</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="admissionType" checked> Admission Type</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="course" checked> Course</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="branch" checked> Branch</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="section" checked> Section</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="year" checked> Academic Year</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="semester" checked> Semester</label>

        <!-- Category 2: Performance -->
        <div class="field-category-title">
          <i class="fa-solid fa-chart-line"></i> Performance & Metrics
        </div>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="gpa" checked> CGPA</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="marksPercentage" checked> Marks Percentage</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="attendance" checked> Attendance %</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="entranceType" checked> Entrance Type</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="cetRank" checked> CET Rank</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="seatCategory" checked> Seat Category</label>

        <!-- Category 3: Personal & Contact -->
        <div class="field-category-title">
          <i class="fa-solid fa-address-card"></i> Personal & Contact Info
        </div>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="phone" checked> Phone / Mobile</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="personalEmail" checked> Personal Email</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="collegeEmail" checked> College Email</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="dob" checked> Date of Birth</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="gender" checked> Gender</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="religion" checked> Religion</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="nationality" checked> Nationality</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="adharNo" checked> Aadhar Number</label>

        <!-- Category 4: Parents & Address -->
        <div class="field-category-title">
          <i class="fa-solid fa-users"></i> Parents & Address Details
        </div>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="fatherName" checked> Father Name</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="fatherMobile" checked> Father Mobile</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="motherName" checked> Mother Name</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="motherMobile" checked> Mother Mobile</label>
        <label class="excel-field-checkbox"><input type="checkbox" name="excelField" value="permanentAddress" checked> Address</label>
      `;
    }
    updateExcelSelectedCount();
  }

  if (exportStudentBtn) {
    exportStudentBtn.addEventListener('click', () => {
      activeExportTarget = 'students';
      renderExportModalFields('students');
      if (excelExportModal) {
        excelExportModal.classList.remove('hidden');
      }
    });
  }

  if (exportFacultyBtn) {
    exportFacultyBtn.addEventListener('click', () => {
      activeExportTarget = 'faculty';
      renderExportModalFields('faculty');
      if (excelExportModal) {
        excelExportModal.classList.remove('hidden');
      }
    });
  }

  // Reusable Export Core Helpers
  function exportDataToExcel(headers, rows, sheetName, filename) {
    if (typeof XLSX === 'undefined') {
      showToast('Excel library (SheetJS) is loading. Please try again.', 'error');
      return;
    }
    const data = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
    showToast(`Exported ${rows.length} record(s) to ${filename}`, 'success');
  }

  function exportDataToCSV(headers, rows, filename) {
    let csvContent = '\uFEFF';
    csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} record(s) to ${filename}`, 'success');
  }

  function exportDataToPDF(title, headers, rows, filename) {
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        showToast('PDF library loading. Please try again.', 'error');
        return;
      }
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 40, 40);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${rows.length}`, 40, 56);

      doc.autoTable({
        head: [headers],
        body: rows.map(r => r.map(c => String(c ?? ''))),
        startY: 68,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, cellPadding: 4 }
      });

      doc.save(filename);
      showToast(`Exported ${rows.length} record(s) to PDF file ${filename}`, 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Error generating PDF file.', 'error');
    }
  }

  function handleExportFormat(format) {
    const dateStr = new Date().toISOString().split('T')[0];
    const targetModal = excelExportModal || customExportModal;

    if (activeExportTarget === 'faculty') {
      const records = (currentFacultyList && currentFacultyList.length > 0) ? currentFacultyList : [];
      if (records.length === 0) {
        showToast('No faculty data available to export.', 'warning');
        return;
      }
      const checkedInputs = Array.from(excelFieldGrid.querySelectorAll('input[name="excelField"]:checked'));
      const selectedFields = checkedInputs.map(cb => cb.value);

      if (selectedFields.length === 0) {
        showToast('Please select at least one faculty attribute to export.', 'warning');
        return;
      }

      const facultyLabelMap = {
        facultyId: 'Faculty ID',
        name: 'Full Name',
        email: 'Email Address',
        phoneNumber: 'Phone Number',
        department: 'Department',
        designation: 'Designation',
        role: 'System Role'
      };

      const headers = selectedFields.map(fk => facultyLabelMap[fk] || fk);
      const rows = records.map(f => {
        return selectedFields.map(fk => {
          if (fk === 'role') return f.role === 'admin' ? 'System Admin' : 'Faculty';
          return f[fk] !== undefined && f[fk] !== null ? f[fk] : '';
        });
      });

      if (format === 'excel') exportDataToExcel(headers, rows, 'Faculty', `Faculty_Directory_${dateStr}.xlsx`);
      if (format === 'csv') exportDataToCSV(headers, rows, `Faculty_Directory_${dateStr}.csv`);
      if (format === 'pdf') exportDataToPDF('Faculty Management Directory', headers, rows, `Faculty_Directory_${dateStr}.pdf`);

      if (targetModal) targetModal.classList.add('hidden');
      return;
    }

    // Default: activeExportTarget === 'students'
    const checkedInputs = Array.from(excelFieldGrid.querySelectorAll('input[name="excelField"]:checked'));
    const selectedFields = checkedInputs.map(cb => cb.value);

    if (selectedFields.length === 0) {
      showToast('Please select at least one attribute to export.', 'warning');
      return;
    }

    const records = (currentStudents && currentStudents.length > 0) ? currentStudents : [];
    if (records.length === 0) {
      showToast('No student data available to export.', 'warning');
      return;
    }

    const headers = selectedFields.map(fieldKey => fieldLabelMap[fieldKey] || fieldKey);
    const rows = records.map(student => {
      return selectedFields.map(fieldKey => {
        if (['fatherName', 'fatherOccupation', 'fatherMobile', 'motherName', 'motherOccupation', 'motherMobile', 'annualIncome', 'permanentAddress'].includes(fieldKey)) {
          const p = student.parentsDetails || {};
          if (fieldKey === 'permanentAddress') return p.permanentAddress || p.correspondenceAddress || '';
          return p[fieldKey] || '';
        }
        return student[fieldKey] !== undefined && student[fieldKey] !== null ? student[fieldKey] : '';
      });
    });

    if (format === 'excel') exportDataToExcel(headers, rows, 'Students', `Student_Records_${dateStr}.xlsx`);
    if (format === 'csv') exportDataToCSV(headers, rows, `Student_Records_${dateStr}.csv`);
    if (format === 'pdf') exportDataToPDF('Academic Student Details Report', headers, rows, `Student_Records_${dateStr}.pdf`);

    if (targetModal) targetModal.classList.add('hidden');
  }

  if (confirmDownloadExcelBtn) {
    confirmDownloadExcelBtn.addEventListener('click', () => handleExportFormat('excel'));
  }
  if (confirmDownloadCsvBtn) {
    confirmDownloadCsvBtn.addEventListener('click', () => handleExportFormat('csv'));
  }
  if (confirmDownloadPdfBtn) {
    confirmDownloadPdfBtn.addEventListener('click', () => handleExportFormat('pdf'));
  }

  // Profile Modal Logic
  let isEditingProfile = false;

  if (openProfileBtn) {
    openProfileBtn.addEventListener('click', openProfileModal);
  }

  function openProfileModal() {
    if (!currentUser) return;
    isEditingProfile = false;

    // Populate view-mode fields
    if (pvFacultyId) pvFacultyId.textContent = currentUser.facultyId || '—';
    if (pvName) pvName.textContent = currentUser.name || '—';
    if (pvEmail) pvEmail.textContent = currentUser.email || '—';
    if (pvPhone) pvPhone.textContent = currentUser.phoneNumber || '—';
    if (pvDepartment) pvDepartment.textContent = currentUser.department || '—';
    if (pvDesignation) pvDesignation.textContent = currentUser.designation || '—';
    if (profileRoleBadge) {
      profileRoleBadge.textContent = currentUser.role === 'admin' ? 'HOD / System Admin' : 'Department Faculty';
      profileRoleBadge.className = currentUser.role === 'admin' ? 'badge badge-rose' : 'badge badge-indigo';
    }
    if (pvPasswordStatus) {
      if (currentUser.role === 'admin') {
        pvPasswordStatus.innerHTML = '<span class="badge badge-emerald"><i class="fa-solid fa-user-shield"></i> System Admin Access</span>';
      } else if (currentUser.hasChangedPassword) {
        pvPasswordStatus.innerHTML = '<span class="badge badge-rose"><i class="fa-solid fa-lock"></i> Password Changed (Locked)</span>';
      } else {
        pvPasswordStatus.innerHTML = '<span class="badge badge-amber"><i class="fa-solid fa-bolt font-bold"></i> ⚡ 1-Time Change Available</span>';
      }
    }

    // Show view mode, hide form
    if (profileViewMode) profileViewMode.classList.remove('hidden');
    if (profileForm) profileForm.classList.add('hidden');
    if (editProfileToggleBtn) {
      editProfileToggleBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Profile';
    }

    profileModal.classList.remove('hidden');
  }

  function enterEditMode() {
    if (!currentUser) return;
    isEditingProfile = true;

    // Populate edit form fields
    if (profileForm) profileForm.reset();
    if (profileFacultyId) {
      profileFacultyId.value = currentUser.facultyId || '';
      profileFacultyId.disabled = true;
      profileFacultyId.readOnly = true;
    }
    if (profileName) profileName.value = currentUser.name || '';
    if (profileEmail) profileEmail.value = currentUser.email || '';
    if (profilePhone) profilePhone.value = currentUser.phoneNumber || '';

    const isAdmin = currentUser.role === 'admin';
    const canChangePwd = isAdmin || !currentUser.hasChangedPassword;

    if (profileDepartment) {
      profileDepartment.value = currentUser.department || '';
      profileDepartment.disabled = !isAdmin;
      profileDepartment.readOnly = !isAdmin;
      profileDepartment.style.opacity = isAdmin ? '1' : '0.7';
      profileDepartment.style.cursor = isAdmin ? 'text' : 'not-allowed';
    }
    if (profileDesignation) {
      profileDesignation.value = currentUser.designation || '';
      profileDesignation.disabled = !isAdmin;
      profileDesignation.readOnly = !isAdmin;
      profileDesignation.style.opacity = isAdmin ? '1' : '0.7';
      profileDesignation.style.cursor = isAdmin ? 'text' : 'not-allowed';
    }
    if (profileNewPassword) {
      profileNewPassword.value = '';
      profileNewPassword.disabled = !canChangePwd;
      profileNewPassword.placeholder = canChangePwd ? 'Enter new password' : 'Password change locked (1-time used)';
      profileNewPassword.style.opacity = canChangePwd ? '1' : '0.6';
      profileNewPassword.style.cursor = canChangePwd ? 'text' : 'not-allowed';
    }
    if (profilePwdNotice) {
      if (isAdmin) {
        profilePwdNotice.className = 'profile-pwd-notice notice-admin';
        profilePwdNotice.innerHTML = '<i class="fa-solid fa-shield-halved text-emerald"></i> As System Admin, you can edit department, designation, and change password anytime.';
      } else if (!currentUser.hasChangedPassword) {
        profilePwdNotice.className = 'profile-pwd-notice notice-faculty';
        profilePwdNotice.innerHTML = '<i class="fa-solid fa-bolt text-amber"></i> <strong>⚡ 1-Time Password Change Opportunity:</strong> You can change your password once. After saving, password changes will be locked for your account.';
      } else {
        profilePwdNotice.className = 'profile-pwd-notice notice-faculty';
        profilePwdNotice.innerHTML = '<i class="fa-solid fa-lock text-rose"></i> <strong>Password Locked:</strong> You have already used your 1-time password change opportunity. Contact System Admin if you need to reset your password.';
      }
    }

    // Show edit form, hide view mode
    if (profileViewMode) profileViewMode.classList.add('hidden');
    if (profileForm) profileForm.classList.remove('hidden');
    if (editProfileToggleBtn) {
      editProfileToggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i> View Mode';
    }
  }

  if (editProfileToggleBtn) {
    editProfileToggleBtn.addEventListener('click', () => {
      if (!isEditingProfile) {
        enterEditMode();
      } else {
        isEditingProfile = false;
        if (profileViewMode) profileViewMode.classList.remove('hidden');
        if (profileForm) profileForm.classList.add('hidden');
        editProfileToggleBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Profile';
      }
    });
  }

  function closeProfileModal() {
    isEditingProfile = false;
    profileModal.classList.add('hidden');
  }

  if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', closeProfileModal);
  if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', () => {
    isEditingProfile = false;
    if (profileViewMode) profileViewMode.classList.remove('hidden');
    if (profileForm) profileForm.classList.add('hidden');
    if (editProfileToggleBtn) {
      editProfileToggleBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Profile';
    }
  });

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        name: profileName ? profileName.value.trim() : '',
        email: profileEmail ? profileEmail.value.trim() : '',
        phoneNumber: profilePhone ? profilePhone.value.trim() : ''
      };

      if (currentUser.role === 'admin') {
        if (profileDepartment) payload.department = profileDepartment.value.trim();
        if (profileDesignation) payload.designation = profileDesignation.value.trim();
      }

      if (profileNewPassword && profileNewPassword.value.trim()) {
        payload.password = profileNewPassword.value.trim();
      }

      try {
        const res = await fetch('/api/faculty/profile/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          token = data.token;
          currentUser = data.faculty;
          sessionStorage.setItem('edupulse_token', token);
          if (facultyNameDisplay) facultyNameDisplay.textContent = currentUser.name;
          if (facultyRoleDisplay) facultyRoleDisplay.textContent = `${currentUser.department || 'Department'} ${currentUser.designation || 'Faculty'}`;
          if (facultyRoleBadge) {
            facultyRoleBadge.textContent = currentUser.role === 'admin' ? 'HOD / ADMIN' : 'FACULTY';
            facultyRoleBadge.className = currentUser.role === 'admin' ? 'role-badge badge-emerald' : 'role-badge badge-indigo';
          }

          showToast('Profile updated successfully!', 'success');
          // Switch back to view mode
          isEditingProfile = false;
          openProfileModal();
        } else {
          showToast(data.message || 'Failed to update profile.', 'error');
        }
      } catch (err) {
        console.error('Error updating profile:', err);
        showToast('Server connection error during profile update.', 'error');
      }
    });
  }
});
