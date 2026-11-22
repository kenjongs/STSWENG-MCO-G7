import {useState, useEffect, useRef} from 'react'
import { supabase } from "../lib/supabase.js";
import {
    addTicketNote,
    startTicketReview,
    resolveTicket,
    closeTicket,
    fetchActiveEmployees,
    assignTicket
} from "../lib/supportApi.js";
import {cx, BTN, INPUT} from '../lib/utils'
import Badge from "../components/Badge.jsx";

/**
 * Case drawer. One scroll: linked records (D04) > complaint > notes (D05) > resolution (D07).
 * The footer action follows the state machine Open > In Review > Resolved > Closed.
 */

export default function CaseDrawer({ caseSelected, onPatch, onClose }) {
    const [note, setNote] = useState('')
    const [resolution, setResolution] = useState(caseSelected.resolution)
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState('');

    const [assignOpen, setAssignOpen] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [assignError, setAssignError] = useState(null);
    const dropdownRef = useRef(null);

    //Load active employees for assignment dropdown
    useEffect(() => {
        if (!assignOpen) return; // Only fetch when dropdown is open
        let isMounted = true; // To prevent state updates if the component unmounts

        fetchActiveEmployees()
            .then((list) => { if (isMounted) setEmployees(list); })
            .catch(() => { if (isMounted) setAssignError('Could not load employees.'); });

        return () => { isMounted = false; }
    }, [assignOpen]);

    // Close the assignment dropdown when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setAssignOpen(false);
                setAssignError('');
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const getCurrentUserId = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            throw new Error('Your session expired. Please sign in again.');
        }
        return user.id;
    }
    // Filter employees based on search query
    const filteredEmployees = employees.filter((employee) =>
        employee.employee_name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    // Handle selecting an assignee from the dropdown
    const handleSelectAssignee = async (employee) => {
        if (saving) return;
        setSaving(true);
        setAssignError('');

        try {
            const assigned = await assignTicket(caseSelected.id, employee.employee_id);
            onPatch(caseSelected.id, { assignee: assigned.employee_name });
            setAssignOpen(false);
            setSearchQuery('');
        } catch (error) {
            setAssignError(error.message || 'Failed to assign ticket. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    // Handle pressing Enter in the search input to select an exact match
    const handleSearchKeyDown = async (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const exactMatch = employees.find(
            (employee) => employee.employee_name.toLowerCase() === searchQuery.trim().toLowerCase());
        if (exactMatch) {
            await handleSelectAssignee(exactMatch);
        } else {
            setAssignError('No matching employee found.');
        }
    }


    const handleAddNote = async () => {
        if (!note.trim() || saving) return; // prevent adding empty notes or adding multiple notes while saving
        setSaving(true);
        setAssignError('')
        try {
            const userId =  await getCurrentUserId()
            const savedNote = await addTicketNote(caseSelected.id, note.trim(), userId);

            onPatch(caseSelected.id, { notes: [...caseSelected.notes, savedNote] });
            setNote('');
        } catch (error) {
            setActionError(error.message || 'Failed to add note.');
        } finally {
            setSaving(false);
        }
    };

    /*
        Start review: Open -> In Review, assign to self if unassigned
        - PATCH /support-cases/:id { status: 'In Review', assignee: 'You' }
     */
    const startReview = async () => {
        if (saving) return; // prevent multiple clicks while saving
        setSaving(true);
        setActionError('');
        try {
            const userId =  await getCurrentUserId();
            const assigneeName =await startTicketReview(caseSelected.id, userId);
            await onPatch(caseSelected.id, { status: 'In Review', assignee: assigneeName })
        }
        catch (error) {
            setActionError(error.message || 'Failed to start review.');
        }
        finally {
            setSaving(false);
        }
    }

    /*
        Resolve ticket: In Review -> Resolved, requires resolution text
        - PATCH /support-cases/:id { status: 'Resolved', resolution: '...' }
     */
    const handleResolveTicket = async () => {
        if (!resolution.trim() || saving) return; // don't resolve without resolution text
        setSaving(true);
        setActionError('')
        try {
            const userId =  await getCurrentUserId();
            const assignedName = await assignTicket(caseSelected.id, userId); // ensure the ticket is assigned to the current user before resolving
            await resolveTicket(caseSelected.id, resolution.trim());
            await onPatch(caseSelected.id, { status: 'Resolved', resolution, assignee: assignedName })
        }
        catch (error) {
            setActionError(error.message || 'Failed to resolve ticket.');
        }
        finally {
            setSaving(false);
        }
    }

    /*
        Close ticket: Resolved -> Closed
        - PATCH /support-cases/:id { status: 'Closed' }
     */
    const handleCloseTicket = async () => {
        if (saving) return; // prevent multiple clicks while saving
        setSaving(true);
        setActionError('');
        try {
            await closeTicket(caseSelected.id);
            await onPatch(caseSelected.id, { status: 'Closed' })
        }
        catch (error) {
            setActionError(error.message || 'Failed to close ticket.');
        }
        finally {
            setSaving(false);
        }
    };

    const links = [
        ['Resident', caseSelected.resident],
        ['Aide', caseSelected.aide],
        ['Booking', caseSelected.booking],
        ['Property', caseSelected.property],
        ['Transaction', caseSelected.txn]]

    return (
        <div className="fixed inset-0 z-40 flex justify-end bg-ink/40" onClick={onClose}>
            <aside className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-start justify-between border-b border-ink/10 p-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{caseSelected.id.slice(0, 8)}</h2>
                            <Badge value={caseSelected.status} />
                        </div>

                        <div className="relative mt-1 flex items-center gap-1.5 text-sm text-ink/60" ref={dropdownRef}>
                            <span>{caseSelected.category}, assigned to</span>
                            <button
                                type="button"
                                disabled={caseSelected.status === 'Closed' || saving}
                                onClick={() => {
                                    setAssignOpen((prev) => !prev);
                                    setSearchQuery('');
                                    setAssignError('');
                                }}
                                className={cx(
                                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors',
                                    caseSelected.status === 'Closed'
                                        ? 'cursor-default text-ink/70'
                                        : 'bg-ink/5 text-ink hover:bg-brand/30 cursor-pointer'
                                )}
                            >
                                {caseSelected.assignee}
                                {caseSelected.status !== 'Closed' && <span className="text-xs opacity-60">▾</span>}
                            </button>

                            {assignOpen && (
                                <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-ink/15 bg-white p-2 shadow-xl">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setAssignError('');
                                        }}
                                        onKeyDown={handleSearchKeyDown}
                                        placeholder="Type employee name..."
                                        className={cx(INPUT, 'py-1.5 text-xs')}
                                    />

                                    {assignError && (
                                        <p role="alert" className="mt-1.5 px-1 text-xs text-red-600">{assignError}</p>
                                    )}

                                    <ul className="mt-1.5 max-h-44 overflow-y-auto divide-y divide-ink/5 text-sm">
                                        {filteredEmployees.map((employee) => (
                                            <li key={employee.employee_id}>
                                                <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => handleSelectAssignee(employee)}
                                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-brand/20"
                                                >
                                                    <span className="font-medium text-ink">{employee.employee_name}</span>
                                                    <span className="text-xs capitalize text-ink/50">{employee.employee_role}</span>
                                                </button>
                                            </li>
                                        ))}
                                        {!filteredEmployees.length && (
                                            <li className="px-2.5 py-3 text-center text-xs text-ink/50">
                                                No matching employee found.
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close case panel" className={BTN.ghost}>Close</button>
                </header>

                <div className="flex-1 space-y-6 overflow-y-auto p-5">
                    {actionError && (
                        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {actionError}
                        </p>
                    )}

                    <section>
                        <h3 className="mb-2 text-sm font-semibold">Linked records</h3>
                        <dl className="divide-y divide-ink/5 rounded-lg border border-ink/10 text-sm">
                            {links.map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-4 px-3 py-2">
                                    <dt className="text-ink/50">{k}</dt>
                                    <dd className="text-right font-medium">{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <section>
                        <h3 className="mb-2 text-sm font-semibold">Complaint</h3>
                        <p className="rounded-lg bg-cream p-3 text-sm leading-relaxed">{caseSelected.description}</p>
                    </section>

                    <section>
                        <h3 className="mb-2 text-sm font-semibold">Notes and responses</h3>
                        <ul className="space-y-2">
                            {caseSelected.notes.map((note, i) => (
                                <li key={note.id || i} className="rounded-lg border border-ink/10 p-3 text-sm">
                                    <p>{note.text}</p>
                                    <p className="mt-1 text-xs text-ink/50">{note.by}, {note.at}</p>
                                </li>
                            ))}
                            {!caseSelected.notes.length && (
                                <li className="text-sm text-ink/50">No notes yet. Record every call or message so the history is complete.</li>
                            )}
                        </ul>
                        {caseSelected.status !== 'Closed' && (
                            <div className="mt-3 flex gap-2">
                                <input
                                    className={INPUT}
                                    value={note}
                                    disabled={saving}
                                    placeholder="Add a note or response"
                                    onChange={(e) => setNote(e.target.value)}
                                />
                                <button className={BTN.dark} onClick={handleAddNote} disabled={!note.trim() || saving}>
                                    Add note
                                </button>
                            </div>
                        )}
                    </section>

                    {caseSelected.status !== 'Open' && (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold">Resolution</h3>
                            <textarea
                                rows={3}
                                className={INPUT}
                                value={resolution}
                                disabled={caseSelected.status !== 'In Review' || saving}
                                placeholder="Describe how the issue was resolved"
                                onChange={(e) => setResolution(e.target.value)}
                            />
                        </section>
                    )}
                </div>

                <footer className="border-t border-ink/10 p-4">
                    {caseSelected.status === 'Open' && (
                        <button className={cx(BTN.primary, 'w-full')} onClick={startReview} disabled={saving}>
                            Start review
                        </button>
                    )}
                    {caseSelected.status === 'In Review' && (
                        <button className={cx(BTN.primary, 'w-full')} onClick={handleResolveTicket} disabled={!resolution.trim() || saving}>
                            Resolve case
                        </button>
                    )}
                    {caseSelected.status === 'Resolved' && (
                        <button className={cx(BTN.dark, 'w-full')} onClick={handleCloseTicket} disabled={saving}>
                            Close case
                        </button>
                    )}
                    {caseSelected.status === 'Closed' && (
                        <p className="text-center text-sm text-ink/50">This case is closed and kept in the support history.</p>
                    )}
                </footer>
            </aside>
        </div>
    );
}