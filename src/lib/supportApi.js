import { supabase } from "./supabase.js";

const convertUI2DB = {
    "Open": "open",
    "In Review": "review",
    "Resolved": "resolved",
    "Closed": "closed"
}

const convertDB2UI = {
    "open": "Open",
    "review": "In Review",
    "resolved": "Resolved",
    "closed": "Closed"
}

/*
This function formats a category string by removing the underscore and capitalizing the first letter of each word.
If the category is null or undefined, it returns 'Other'.
 */
const formatCategory = (cat) =>
    cat ? cat.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Other';

/*
 * Format a date string from the database.
 * The format includes the month (short), day, year, and time (hour and minute).
 *
 * @param {string} date - A date string from the database.
 * @returns {string} - A formatted date string for display in the UI.
 */
const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/*
 * Format a row from the database into the format expected by the UI.
 * This includes converting status values, formatting dates, and handling missing data.
 *
 * @param {Object} row - A single row from the database representing a support case.
 */
function formatRowTicket (row) {
    const aideName = [
        row.aide?.first_name,
        row.aide?.middle_name,
        row.aide?.last_name,
        row.aide?.suffix,
    ]
        .filter(Boolean)
        .join(' ');

    const condoName = row.booking?.address?.condo?.name;
    const unitDetails = [row.booking?.address?.tower, row.booking?.address?.unit_number]
        .filter(Boolean)
        .join(' ');

    return {
        id: row.ticket_id,
        code: row.ticket_code || row.ticket_id?.slice(0, 8) || 'N/A',
        category: formatCategory(row.ticket_category),
        status: convertDB2UI[row.ticket_status] || 'Open',
        created: formatDate(row.receive_date),
        resident: row.resident?.full_name || row.resident_id || 'N/A',
        aide: aideName || row.aide_id || 'N/A',
        property: row.booking?.address?.condo?.name || 'N/A',
        booking: row.booking?.booking_code || row.booking_id || 'N/A',
        txn: row.booking?.payment_method?.toUpperCase() || 'N/A',
        assignee: row.assigned_employee?.employee_name || 'Unassigned',
        description: row.ticket_description || '',
        notes: (row.notes || []).map((n) => ({
            id: n.note_id,
            by: n.author?.employee_name || 'Admin',
            at: formatDate(n.creation_date),
            text: n.note || '',
        })),
        resolution: row.ticket_remarks || '',
    }
}

/*
 * Fetch all support cases from the database, including related data from employees, residents, aides, and bookings.
 *
 * @returns {Promise<Array>} - A promise that resolves to an array of formatted support cases.
 */
export async function fetchCases() {
    const { data, error } = await supabase
        .from('adm_tickets')
        .select(`
            *,
            assigned_employee:adm_employees!adm_tickets_assigned_employee_id_fkey(employee_id, employee_name),
            resident:usr_residents(*),
            aide:aide_aides(*),
            booking:usr_bookings(*),
            notes:adm_ticket_notes(
                note_id,
                note,
                creation_date,
                author:adm_employees!adm_ticket_notes_employee_id_fkey(employee_name)
            )
        `)
        .order('receive_date', { ascending: false })
        .order('creation_date', { referencedTable: 'notes', ascending: true });
    if (error) {
        console.error('Error fetching cases:', error);
        throw error;
    }
    return data.map(formatRowTicket);
}

/*
 * This functions adds a note to the specified ticket in the database.
 *
 * @param {string} ticketId - The ID of the ticket to which the note will be added.
 * @param {string} noteText - The text of the note to be added.
 * @param {string} currentAdminId - The ID of the currently logged-in admin adding the note.
 *
 * @returns {Promise<Object>} - A promise that resolves to an object containing the added note's details
 */
export async function addTicketNote(ticketId, noteText, currentAdminId) {
    if (!noteText.trim()) {
        throw new Error('Note cannot be empty or consist only of spaces.');
    }

    const { data, error } = await supabase
        .from('adm_ticket_notes')
        .insert({
            ticket_id: ticketId,
            note: noteText,
            employee_id: currentAdminId
        })
        .select(`
            note_id,
            note,
            creation_date,
            author:adm_employees!adm_ticket_notes_employee_id_fkey(employee_name)
        `)
        .single();

    if (error) {
        console.error('Error adding note:', error);
        throw error;
    }

    return {
        id: data.note_id,
        by: data.author?.employee_name || 'Admin',
        at: formatDate(data.creation_date),
        text: data.note,
    }
}

/*
 * This function updates the status of an open ticket to "In Review" and assigns it to the current admin.
 * to be implemented soon: admin will be able to assign the ticket to another admin if needed
 *
 * @param {string} ticketId - The ID of the ticket to be updated.
 * @param {string} adminId - The ID of the admin who will start the review.
 */
export async function startTicketReview(ticketId, adminId) {
    const { data, error } = await supabase
        .from('adm_tickets')
        .update({
            ticket_status: convertUI2DB['In Review'],
            assigned_employee_id: adminId
        })
        .eq('ticket_id', ticketId);

    if (error) {
        console.error('Error starting ticket review:', error);
        throw error;
    }
}

/*
 * This function updates the status of a ticket to "Resolved" and adds a resolution text.
 *
 * @param {string} ticketId - The ID of the ticket to be resolved.
 * @param {string} resolutionText - The text describing the resolution of the ticket.
 */
export async function resolveTicket(ticketId, resolutionText) {
    if (!noteText.trim()) {
        throw new Error('Note cannot be empty or consist only of spaces.');
    }

    const { data, error } = await supabase
        .from('adm_tickets')
        .update({
            ticket_status: convertUI2DB ['Resolved'],
            ticket_remarks: resolutionText,
            resolve_date: new Date().toISOString(),
        })
        .eq('ticket_id', ticketId);

    if (error) {
        console.error('Error resolving ticket:', error);
        throw error;
    }
}

/*
 * This function updates the status of a ticket to "Closed".
 *
 * @param {string} ticketId - The ID of the ticket to be closed.
 */
export async function closeTicket(ticketId) {
    const { data, error } = await supabase
        .from('adm_tickets')
        .update({
            ticket_status: convertUI2DB ['Closed'],
            close_date: new Date().toISOString(),
        })
        .eq('ticket_id', ticketId);

    if (error) {
        console.error('Error closing ticket:', error);
        throw error;
    }
}

/*
 * This function fetches all active employees from the database, which will be used for assigning tickets.
 */
export async function fetchActiveEmployees() {
    const { data, error } = await supabase
        .from('adm_employees')
        .select('employee_id, employee_name')
        .eq('is_active', true)
        .order('employee_name', { ascending: true });

    if (error) {
        console.error('Error fetching active employees:', error);
        throw error;
    }

    return data || [];
}

/*
 * This function assigns a ticket to a specific employee
 *
 * @param {string} ticketId - The ID of the ticket to be assigned.
 * @param {string} employeeId - The ID of the employee to whom the ticket will be assigned.
 */
export async function assignTicket(ticketId, employeeId) {
    const { data: employee, error: lookUpError } = await supabase
        .from('adm_employees')
        .select('employee_id, employee_name')
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .single();

    // Check if the employee exists and is active
    if (lookUpError || !employee) {
        throw new Error('Employee does not exist in the database or inactive');
    }

    // Update the ticket's assigned employee in the database
    const { error: updateError } = await supabase
        .from('adm_tickets')
        .update({
            assigned_employee_id: employeeId
        })
        .eq('ticket_id', ticketId);

    if (updateError) {
        console.error('Error assigning ticket:', updateError);
        throw updateError;
    }

    return employee
}