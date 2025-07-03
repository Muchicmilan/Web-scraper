import React, { useState, useEffect } from 'react';
import { useScraperManager } from '../hooks/useScraperManager';
import { NewAccountData } from '../Types';

const AccountManager: React.FC = () => {
    const { accounts, fetchAccounts, createAccount, isLoading, error, clearError } = useScraperManager();
    const [formData, setFormData] = useState<NewAccountData>({ platform: '', username: '', password: '' });

    useEffect(() => {
        fetchAccounts();
        return () => { clearError(); };
    }, [fetchAccounts, clearError]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.platform || !formData.username || !formData.password) {
            alert("All fields are required.");
            return;
        }
        const newAccount = await createAccount(formData);
        if (newAccount) {
            setFormData({ platform: '', username: '', password: '' }); // Clear form on success
        }
    };

    return (
        <div className="account-manager" style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', backgroundColor: '#f9f9f9' }}>
            <h3>Account Management</h3>
            <p>Store credentials here to use them in your scraper configurations.</p>

            {error && <div className="error-message">Error: {error} <button onClick={clearError}>×</button></div>}

            {/* Form to create a new account */}
            <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
                <h4>Add New Account</h4>
                <div style={{ marginBottom: '10px' }}>
                    <label>Platform (e.g., "Example.com"):</label>
                    <input type="text" name="platform" value={formData.platform} onChange={handleInputChange} required disabled={isLoading} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Username:</label>
                    <input type="text" name="username" value={formData.username} onChange={handleInputChange} required disabled={isLoading} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Password:</label>
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} required disabled={isLoading} />
                </div>
                <button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Account'}</button>
            </form>

            {/* List of existing accounts */}
            <div>
                <h4>Stored Accounts</h4>
                {isLoading && accounts.length === 0 && <p>Loading accounts...</p>}
                {accounts.length === 0 && !isLoading && <p>No accounts stored yet.</p>}
                <table className="configurations-table" style={{ width: '100%' }}>
                    <thead>
                    <tr>
                        <th style={{ textAlign: 'left' }}>Platform</th>
                        <th style={{ textAlign: 'left' }}>Username</th>
                        <th style={{ textAlign: 'left' }}>Created At</th>
                    </tr>
                    </thead>
                    <tbody>
                    {accounts.map(acc => (
                        <tr key={acc._id}>
                            <td>{acc.platform}</td>
                            <td>{acc.username}</td>
                            <td>{new Date(acc.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AccountManager;