import { useState } from 'react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.svg';

const ADMIN_FEATURES = [
    {
        title: 'Resolve Resident & Aide Support Tickets',
        description: 'Triage disputes, assign cases to support staff, log investigation notes, and close resolved issues.',
        icon: (
            <svg className="w-5 h-5 text-[#101828]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
    },
    {
        title: 'Manage Aide Disbursements & Payroll',
        description: 'Review completed booking payouts, verify commission splits, and approve batch disbursements.',
        icon: (
            <svg className="w-5 h-5 text-[#101828]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
    },
];

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const HandleSubmit = async (e) => {
        e.preventDefault();
        const form_contents = new FormData(e.currentTarget);
        const username = String(form_contents.get('username') ?? '').trim();
        const password = String(form_contents.get('password') ?? '');
        const user_lookup = await supabase.rpc('get_employee_login_email', { username });
        // TODO: needs a user not found popup
        if (user_lookup.error || !user_lookup.data) return;
        const { error } = await supabase.auth.signInWithPassword({
            email: user_lookup.data,
            password,
        });
        // TODO: needs an error popup, same as user not found but diff text
        if (error) return;
        onLogin();
    };

    return (
        <div className='min-h-screen w-full bg-gray-900 text-slate-100 flex flex-row'>
            {/* Left panel */}
            <div className='w-1/2 bg-yellow-500 border-r border-yellow-600 p-12 flex flex-col justify-between relative overflow-hidden'>
                <div className='absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.25)_0%,transparent_70%)] pointer-events-none' />
                <div className='absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.25)_0%,transparent_70%)] pointer-events-none' />

                <div className='h-16 overflow-hidden flex items-center z-10'>
                    <img src={logo} alt='Logo' className='h-80 w-auto max-w-none -ml-10 object-contain' />
                </div>

                <div className='w-full max-w-2xl z-10 flex flex-col gap-8'>
                    <div className='flex flex-col gap-3'>
                        <h1 className='text-3xl lg:text-4xl 2xl:text-5xl font-extrabold tracking-tight leading-tight text-black whitespace-nowrap'>
                            Operations & Support Portal
                        </h1>
                        <p className='text-gray-900/85 text-base lg:text-lg leading-relaxed max-w-xl'>
                            Manage condo service operations, resolve resident and aide tickets, and oversee platform payouts in one place.
                        </p>
                    </div>

                    <div className='flex flex-col gap-5 max-w-xl'>
                        {ADMIN_FEATURES.map((feature) => (
                            <div key={feature.title} className='flex items-start gap-4'>
                                <div className='mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/10'>
                                    {feature.icon}
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <h2 className='text-base lg:text-lg font-bold text-black'>
                                        {feature.title}
                                    </h2>
                                    <p className='text-sm lg:text-base text-gray-900/85 leading-relaxed'>
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className='flex items-center gap-1.5 text-xs text-gray-800 z-10'>
                    <span>&copy; {new Date().getFullYear()}</span>
                    <span>Manong All Rights Reserved.</span>
                </div>
            </div>

            {/* Right panel */}
            <div className='w-1/2 p-12 flex flex-col items-center justify-center'>
                <div className='w-full max-w-md flex flex-col gap-8'>
                    <div className='flex flex-col gap-1.5'>
                        <h2 className='text-2xl font-bold tracking-tight text-white'>
                            Sign in
                        </h2>
                        <p className='text-sm text-slate-400'>
                            Enter an admin credential below.
                        </p>
                    </div>

                    <form onSubmit={HandleSubmit} className='flex flex-col gap-5'>
                        <div className='flex flex-col gap-2'>
                            <label htmlFor='username' className='text-sm font-medium text-slate-200'>
                                Username
                            </label>
                            <input
                                id='username'
                                name='username'
                                type='text'
                                placeholder='Enter username'
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className='w-full pl-4 pr-11 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:text-white focus:bg-slate-700 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors text-sm'
                            />
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label htmlFor='password' className='text-sm font-medium text-slate-200'>
                                Password
                            </label>
                            <div className='relative'>
                                <input
                                    id='password'
                                    name='password'
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder='Enter password'
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className='w-full pl-4 pr-11 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:text-white focus:bg-slate-700 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors text-sm'
                                />
                                <button
                                    type='button'
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className='absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-yellow-400 transition-colors cursor-pointer'
                                >
                                    {showPassword ? (
                                        <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={1.8}>
                                            <path strokeLinecap='round' strokeLinejoin='round' d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                                        </svg>
                                    ) : (
                                        <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={1.8}>
                                            <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                                            <path strokeLinecap='round' strokeLinejoin='round' d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type='submit'
                            className='w-full py-2.5 px-4 mt-2 rounded-lg bg-yellow-500 transition-colors hover:bg-yellow-400 text-black font-semibold text-sm shadow-lg shadow-yellow-500/10 cursor-pointer'>
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}