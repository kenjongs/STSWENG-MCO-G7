import {useState, useEffect } from "react";
import { fetchCases } from "../lib/supportApi.js";
import Metric from '../components/Metric';
import Badge from '../components/Badge';
import {cx, TD, TH} from '../lib/utils';
import CaseDrawer from "./CaseDrawer.jsx";
import {supabase} from "../lib/supabase.js";

export default function SupportPage() {
    const [cases, setCases] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('All')
    const [openId, setOpenId] = useState(null)
    const STATUSES = ['Open', 'In Review', 'Resolved', 'Closed']

    // Fetch cases from Supabase on component mount
    useEffect(() => {
        let isMounted = true; // To prevent state updates if the component unmounts

        async function loadCases() {
            try {
                const tickets = await fetchCases();
                if (isMounted) {
                    setCases(tickets);
                }
            }
            catch (e) {
                console.error('Failed to fetch cases:', e.message);
            }
            finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadCases();

        const channel = supabase
            .channel('support-ticket-real-time')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'adm_tickets' }, loadCases)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'adm_ticket_notes' }, loadCases)
            .subscribe();

        return () => {
            isMounted = false
            supabase.removeChannel(channel);
        };
    }, []);

    //Update a case in the state when changes are made in the CaseDrawer
    const patchCase = (id, updates) => {
        setCases ((cases) =>
            cases.map((caseSelected) =>
                cases.id === id ? { ...caseSelected, ...updates } : caseSelected))
    }

    const shown = filter === 'All' ? cases : cases.filter((caseSelected) => caseSelected.status === filter);
    const selected = cases.find((caseSelected) => caseSelected.id === openId);

    return (
        <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {STATUSES.map((statuses) => (
                    <Metric key={statuses} label={statuses} value={cases.filter((caseSelected) => caseSelected.status === statuses).length} />
                ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-ink/10 bg-white">
                <div className="flex gap-1 border-b border-ink/10 p-2" role="tablist">
                    {['All', ...STATUSES].map((statuses) => (
                        <button key={statuses} role="tab" aria-selected={filter === statuses} onClick={() => setFilter(statuses)}
                                className={cx('rounded-lg px-3 py-1.5 text-sm font-medium', filter === statuses ? 'bg-ink text-cream' : 'text-ink/60 hover:bg-ink/5')}>
                            {statuses}
                        </button>
                    ))}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-ink/10">
                        <tr>{['Case', 'Resident', 'Category', 'Booking', 'Status', 'Assigned to', 'Received'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-ink/5">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-10 text-center text-ink/50">Loading support tickets...</td></tr>
                        ) : (
                            <>
                                {shown.map((caseSelected) => (
                                    <tr key={caseSelected.id} tabIndex={0} onClick={() => setOpenId(caseSelected.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(caseSelected.id)}
                                        className="cursor-pointer hover:bg-brand/10">
                                        <td className={cx(TD, 'font-semibold whitespace-nowrap')}>{caseSelected.code}</td>
                                        <td className={TD}>{caseSelected.resident.split(',')[0]}</td>
                                        <td className={TD}>{caseSelected.category}</td>
                                        <td className={cx(TD, 'whitespace-nowrap')}>{caseSelected.booking}</td>
                                        <td className={TD}><Badge value={caseSelected.status} /></td>
                                        <td className={cx(TD, caseSelected.assignee === 'Unassigned' && 'text-ink/40')}>{caseSelected.assignee}</td>
                                        <td className={cx(TD, 'text-ink/60')}>{caseSelected.created}</td>
                                    </tr>
                                ))}
                                {!shown.length &&
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-ink/50">
                                            No {filter === 'All' ? 'cases' : `${filter.toLowerCase()} cases`} right now.
                                        </td>
                                    </tr>}
                            </>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selected && <CaseDrawer key={selected.id} caseSelected={selected} onPatch={patchCase} onClose={() => setOpenId(null)} />}
        </>
    );
}