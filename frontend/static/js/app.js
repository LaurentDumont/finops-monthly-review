$(document).ready(function() {
    // Event listeners
    $('#runComparison').on('click', function() {
        runComparison();
    });

    $('#startReview').on('click', function() {
        startReviewWorkflow();
    });

    $('#saveExplanation').on('click', function() {
        saveExplanationAndContinue();
    });

    // Search functionality
    $('#serviceSearch').on('input', function() {
        filterTable();
    });

    $('#clearSearch').on('click', function() {
        $('#serviceSearch').val('');
        filterTable();
    });
});


function runComparison() {
    const button = $('#runComparison');
    const spinner = $('#loadingSpinner');
    const summarySection = $('#summarySection');
    const resultsSection = $('#resultsSection');
    const errorSection = $('#errorSection');

    // Show loading state
    button.prop('disabled', true);
    spinner.removeClass('d-none');
    summarySection.addClass('d-none');
    resultsSection.addClass('d-none');
    errorSection.addClass('d-none');

    // Make API call
    $.ajax({
        url: '/api/compare',
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            displayResults(data);
            summarySection.removeClass('d-none');
            resultsSection.removeClass('d-none');
        },
        error: function(xhr, status, error) {
            let errorMessage = 'An error occurred while fetching the comparison data.';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMessage = xhr.responseJSON.error;
            }
            $('#errorMessage').text(errorMessage);
            errorSection.removeClass('d-none');
        },
        complete: function() {
            // Hide loading state
            button.prop('disabled', false);
            spinner.addClass('d-none');
        }
    });
}

// Global variables for review workflow
let reviewData = null;
let reviewIndex = 0;
let incidents = [];

function displayResults(data) {
    // Store data globally for review workflow
    reviewData = data;

    // Update summary section
    $('#previousMonthName').text(data.previous_month.name);
    $('#currentMonthName').text(data.current_month.name);

    // Calculate totals
    let previousTotal = 0;
    let currentTotal = 0;

    data.comparison.forEach(function(item) {
        previousTotal += item.previous_cost;
        currentTotal += item.current_cost;
    });

    $('#previousMonthTotal').text(formatCurrency(previousTotal));
    $('#currentMonthTotal').text(formatCurrency(currentTotal));

    const totalChange = currentTotal - previousTotal;
    const totalChangePercent = previousTotal > 0 ? (totalChange / previousTotal * 100) : 0;

    let changeText = formatCurrency(Math.abs(totalChange));
    if (totalChange > 0) {
        changeText = '+' + changeText + ' (+' + totalChangePercent.toFixed(1) + '%)';
        $('#totalChange').removeClass('cost-negative cost-neutral').addClass('cost-positive');
    } else if (totalChange < 0) {
        changeText = '-' + changeText + ' (' + totalChangePercent.toFixed(1) + '%)';
        $('#totalChange').removeClass('cost-positive cost-neutral').addClass('cost-negative');
    } else {
        changeText = '$0.00 (0.0%)';
        $('#totalChange').removeClass('cost-positive cost-negative').addClass('cost-neutral');
    }
    $('#totalChange').text(changeText);

    // Populate table
    const tableBody = $('#comparisonTableBody');
    tableBody.empty();

    data.comparison.forEach(function(item, index) {
        const row = createTableRow(item, index);
        tableBody.append(row);
    });

    // Show Start Review button if there are cost increases
    const hasIncreases = data.comparison.some(item => item.status === 'increased');
    if (hasIncreases) {
        $('#startReview').removeClass('d-none');
    }
}

function createTableRow(item, index) {
    const row = $('<tr>').attr('data-index', index);

    // Apply status-based styling
    row.addClass('status-' + item.status);

    // Service name
    const serviceCell = $('<td>').addClass('service-name').text(item.service);
    row.append(serviceCell);

    // Previous cost
    const previousCostCell = $('<td>').addClass('cost-amount').text(formatCurrency(item.previous_cost));
    row.append(previousCostCell);

    // Current cost
    const currentCostCell = $('<td>').addClass('cost-amount').text(formatCurrency(item.current_cost));
    row.append(currentCostCell);

    // Change amount
    const change = item.change;
    const changeCell = $('<td>').addClass('cost-amount');

    if (change > 0) {
        changeCell.addClass('cost-positive').text('+' + formatCurrency(change));
    } else if (change < 0) {
        changeCell.addClass('cost-negative').text('-' + formatCurrency(Math.abs(change)));
    } else {
        changeCell.addClass('cost-neutral').text('$0.00');
    }
    row.append(changeCell);

    // Change percentage
    const percentCell = $('<td>').addClass('cost-amount');
    if (item.change_percent !== null) {
        const percentText = item.change_percent.toFixed(1) + '%';
        if (item.change_percent > 0) {
            percentCell.addClass('cost-positive').text('+' + percentText);
        } else if (item.change_percent < 0) {
            percentCell.addClass('cost-negative').text(percentText);
        } else {
            percentCell.addClass('cost-neutral').text(percentText);
        }
    } else {
        percentCell.addClass('cost-neutral').text('-');
    }
    row.append(percentCell);

    // Status badge
    const statusCell = $('<td>');
    const statusBadge = $('<span>').addClass('badge badge-' + item.status);

    switch(item.status) {
        case 'new':
            statusBadge.text('New');
            break;
        case 'increased':
            statusBadge.text('Increased');
            break;
        case 'decreased':
            statusBadge.text('Decreased');
            break;
        case 'unchanged':
            statusBadge.text('Unchanged');
            break;
        case 'removed':
            statusBadge.text('Removed');
            break;
    }

    statusCell.append(statusBadge);
    row.append(statusCell);

    // Action column (hidden by default, shown in review mode)
    const actionCell = $('<td>').addClass('d-none review-action-cell');
    if (item.status === 'increased') {
        const reviewBtn = $('<button>')
            .addClass('btn btn-warning review-action-btn')
            .attr('data-index', index)
            .html('<i class="fas fa-edit"></i> Review')
            .on('click', function() {
                showExplanationModal(item, index);
            });
        actionCell.append(reviewBtn);
    }
    row.append(actionCell);

    return row;
}

function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

// Review Workflow Functions
function startReviewWorkflow() {
    if (!reviewData) return;

    // Enter review mode
    $('#comparisonTable').addClass('review-mode');
    $('#reviewActionHeader').removeClass('d-none');
    $('.review-action-cell').removeClass('d-none');
    $('#startReview').addClass('d-none');

    // Find cost increases to review (only visible ones)
    const visibleIncreasedItems = getVisibleIncreasedItems();
    if (visibleIncreasedItems.length === 0) {
        showReviewComplete();
        return;
    }

    reviewIndex = 0;
    incidents = [];
    showNextReviewItem();
}

function getVisibleIncreasedItems() {
    const visibleItems = [];
    $('#comparisonTableBody tr:not(.search-hidden)').each(function() {
        const index = $(this).data('index');
        const item = reviewData.comparison[index];
        if (item && item.status === 'increased') {
            visibleItems.push({ item, index });
        }
    });
    return visibleItems;
}

function showNextReviewItem() {
    if (!reviewData) return;

    const visibleIncreasedItems = getVisibleIncreasedItems();

    if (reviewIndex >= visibleIncreasedItems.length) {
        showReviewComplete();
        return;
    }

    // Remove previous active state
    $('.review-active').removeClass('review-active');

    // Find the current item to review
    const currentItemData = visibleIncreasedItems[reviewIndex];
    const currentItem = currentItemData.item;
    const itemIndex = currentItemData.index;

    // Highlight current row
    $(`tr[data-index="${itemIndex}"]`).addClass('review-active');

    // Auto-scroll to active row
    const activeRow = $('.review-active');
    if (activeRow.length > 0) {
        activeRow[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Show explanation modal
    showExplanationModal(currentItem, itemIndex);
}

function showExplanationModal(item, index) {
    $('#modalServiceName').text(item.service);
    $('#modalCostChange').text('+' + formatCurrency(item.change) + ' (+' + item.change_percent.toFixed(1) + '%)');
    $('#explanationText').val('');

    // Store current item info
    $('#explanationModal').data('item', item).data('index', index);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('explanationModal'));
    modal.show();
}

function saveExplanationAndContinue() {
    const explanation = $('#explanationText').val().trim();
    const modal = bootstrap.Modal.getInstance(document.getElementById('explanationModal'));
    const item = $('#explanationModal').data('item');
    const index = $('#explanationModal').data('index');

    if (explanation) {
        // Create incident for this cost increase
        const incident = {
            id: 'INC-' + Date.now(),
            service: item.service,
            costChange: item.change,
            changePercent: item.change_percent,
            explanation: explanation,
            timestamp: new Date().toISOString()
        };
        incidents.push(incident);

        // Mark row as completed
        $(`tr[data-index="${index}"]`).addClass('review-completed');
    }

    // Mark as reviewed regardless of explanation
    $(`tr[data-index="${index}"]`).removeClass('review-active').addClass('review-completed');

    // Close modal
    modal.hide();

    // Move to next item
    reviewIndex++;
    setTimeout(() => {
        showNextReviewItem();
    }, 300);
}

function showReviewComplete() {
    // Exit review mode
    $('#comparisonTable').removeClass('review-mode');
    $('.review-active').removeClass('review-active');

    // Save incidents to backend if any were created
    if (incidents.length > 0) {
        saveIncidentsToBackend();
    }

    // Update summary (count only visible items that were reviewed)
    const totalVisibleIncreases = getVisibleIncreasedItems().length;
    $('#reviewedCount').text(totalVisibleIncreases);

    // Show incidents if any were created
    if (incidents.length > 0) {
        $('#incidentSummary').removeClass('d-none');
        const incidentList = $('#incidentList');
        incidentList.empty();

        incidents.forEach(incident => {
            const incidentItem = $('<div>').addClass('alert alert-info mb-2');
            incidentItem.html(`
                <strong>${incident.id}</strong> - ${incident.service}<br>
                <small>Cost increase: +${formatCurrency(incident.costChange)} (+${incident.changePercent.toFixed(1)}%)</small><br>
                <small><em>${incident.explanation}</em></small>
            `);
            incidentList.append(incidentItem);
        });
    }

    // Show completion modal
    const modal = new bootstrap.Modal(document.getElementById('reviewCompleteModal'));
    modal.show();

    // Reset review state
    reviewIndex = 0;
    $('.review-completed').removeClass('review-completed');
    $('#reviewActionHeader').addClass('d-none');
    $('.review-action-cell').addClass('d-none');
    $('#startReview').removeClass('d-none');
}

function saveIncidentsToBackend() {
    $.ajax({
        url: '/api/incidents',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            incidents: incidents
        }),
        success: function(response) {
            console.log('Incidents saved successfully:', response);
        },
        error: function(xhr, status, error) {
            console.error('Failed to save incidents:', error);
        }
    });
}

// Search/Filter Functions
function filterTable() {
    const searchTerm = $('#serviceSearch').val().toLowerCase().trim();
    const tableRows = $('#comparisonTableBody tr');
    let visibleCount = 0;
    let totalCount = tableRows.length;

    tableRows.each(function() {
        const row = $(this);
        const serviceName = row.find('.service-name').text().toLowerCase();

        if (searchTerm === '' || serviceName.includes(searchTerm)) {
            row.removeClass('search-hidden');
            visibleCount++;
        } else {
            row.addClass('search-hidden');
        }
    });

    // Update search results text
    updateSearchResults(visibleCount, totalCount, searchTerm);

    // Update Start Review button visibility based on filtered results
    updateReviewButtonVisibility();
}

function updateSearchResults(visibleCount, totalCount, searchTerm) {
    const resultsText = $('#searchResults');

    if (searchTerm === '') {
        resultsText.text('Showing all services');
    } else if (visibleCount === 0) {
        resultsText.text('No services found');
    } else if (visibleCount === totalCount) {
        resultsText.text(`All ${totalCount} services match "${searchTerm}"`);
    } else {
        resultsText.text(`Showing ${visibleCount} of ${totalCount} services`);
    }
}

function updateReviewButtonVisibility() {
    if (!reviewData) return;

    // Check if there are any visible cost increases
    const visibleIncreases = $('#comparisonTableBody tr:not(.search-hidden)').filter(function() {
        const index = $(this).data('index');
        return reviewData.comparison[index] && reviewData.comparison[index].status === 'increased';
    });

    if (visibleIncreases.length > 0) {
        $('#startReview').removeClass('d-none');
    } else {
        $('#startReview').addClass('d-none');
    }
}