document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Chart canvases
    const taskFrequencyCtx = document.getElementById('task-frequency-chart').getContext('2d');
    const pointDistributionCtx = document.getElementById('point-distribution-chart').getContext('2d');
    const exportBtn = document.getElementById('export-csv-btn');

    let taskFrequencyChart = null;
    let pointDistributionChart = null;

    // --- Function to generate random colors for charts ---
    const generateColors = (numColors) => {
        const colors = [];
        for (let i = 0; i < numColors; i++) {
            const r = Math.floor(Math.random() * 155) + 100;
            const g = Math.floor(Math.random() * 155) + 100;
            const b = Math.floor(Math.random() * 155) + 100;
            colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
        }
        return colors;
    };

    // --- Main function to fetch data and render charts ---
    const fetchReportData = async () => {
        showLoader();
        try {
            const response = await fetch('/api/reports/task-summary', { headers: authHeaders });
            if (!response.ok) {
                throw new Error('Could not fetch report data.');
            }
            const data = await response.json();
            
            if (data.length === 0) {
                document.querySelector('.row').innerHTML = '<p class="text-center text-muted">Not enough data to generate reports yet.</p>';
                exportBtn.disabled = true; // Still disable export if no data
                return;
            }

            renderTaskFrequencyChart(data);
            renderPointDistributionChart(data);
            exportBtn.disabled = false; // Ensure button is enabled if there is data

        } catch (error) {
            console.error('Error fetching report data:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };

    // --- Chart Rendering Functions ---
    const renderTaskFrequencyChart = (data) => {
        if (taskFrequencyChart) taskFrequencyChart.destroy();
        const labels = data.map(item => item._id);
        const counts = data.map(item => item.count);
        taskFrequencyChart = new Chart(taskFrequencyCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Times Logged',
                    data: counts,
                    backgroundColor: generateColors(labels.length),
                    borderColor: '#555',
                    borderWidth: 1
                }]
            },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
        });
    };

    const renderPointDistributionChart = (data) => {
        if (pointDistributionChart) pointDistributionChart.destroy();
        const labels = data.map(item => item._id);
        const points = data.map(item => item.totalPoints);
        pointDistributionChart = new Chart(pointDistributionCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Points',
                    data: points,
                    backgroundColor: generateColors(labels.length),
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    };

    // --- Data Export Functionality ---
    const handleExport = async () => {
        showLoader();
        try {
            const response = await fetch('/api/tasks/all', { headers: authHeaders });
            if (!response.ok) throw new Error('Could not fetch raw task data for export.');
            
            const tasks = await response.json();
            
            let csvContent = "data:text/csv;charset=utf-8,Task Name,Points,Worker Name,Date\n";
            tasks.forEach(task => {
                const workerName = task.workerId ? task.workerId.name.replace(/,/g, '') : 'Deleted Worker';
                const date = new Date(task.timestamp).toLocaleString();
                csvContent += `${task.taskName},${task.points},${workerName},"${date}"\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "sot_tasks_export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Data exported successfully!', 'success');

        } catch (error) {
            console.error('Error exporting data:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };

    exportBtn.addEventListener('click', handleExport);
    fetchReportData();
});
