// /admin/js/reports.js

document.addEventListener("DOMContentLoaded", () => {
    const weeklyBtn = document.getElementById('weekly-btn');
    const monthlyBtn = document.getElementById('monthly-btn');
    const weeklyReport = document.getElementById('weekly-report');
    const monthlyReport = document.getElementById('monthly-report');

    weeklyBtn.addEventListener('click', () => {
        weeklyBtn.classList.add('btn-primary');
        weeklyBtn.classList.remove('btn-outline-primary');
        monthlyBtn.classList.remove('btn-secondary');
        monthlyBtn.classList.add('btn-outline-secondary');

        weeklyReport.classList.remove('d-none');
        monthlyReport.classList.add('d-none');
    });

    monthlyBtn.addEventListener('click', () => {
        monthlyBtn.classList.add('btn-secondary');
        monthlyBtn.classList.remove('btn-outline-secondary');
        weeklyBtn.classList.remove('btn-primary');
        weeklyBtn.classList.add('btn-outline-primary');

        monthlyReport.classList.remove('d-none');
        weeklyReport.classList.add('d-none');
    });
});

