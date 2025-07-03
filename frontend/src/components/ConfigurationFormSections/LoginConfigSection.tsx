import React from 'react';
import { LoginConfig, IAccount } from '../../Types';
import "styles.css";

interface Props {
    options: LoginConfig | undefined;
    accounts: IAccount[];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const defaultOptions: LoginConfig = {
    requiresLogin: false,
    accountId: undefined,
    loginUrl: '',
    usernameSelector: '',
    passwordSelector: '',
    submitButtonSelector: '',
    postLoginSelector: '',
};

const LoginConfigSection: React.FC<Props> = ({ options, accounts, onChange, onCheckboxChange }) => {
    const currentOptions = { ...defaultOptions, ...(options ?? {}) };

    return (
        <div className="form-section">
            <h3>Login Configuration</h3>
            <div className="form-field">
                <label htmlFor="requiresLogin" style={{ display: 'inline-block', marginRight: '10px' }}>
                    Requires Login?
                </label>
                <input
                    type="checkbox"
                    id="requiresLogin"
                    name="requiresLogin"
                    checked={!!currentOptions.requiresLogin}
                    onChange={onCheckboxChange}
                />
            </div>

            {currentOptions.requiresLogin && (
                <div className="options-subsection">
                    <div className="form-field">
                        <label htmlFor="accountId">Account to Use: <span style={{ color: 'red' }}>*</span></label>
                        <select id="accountId" name="accountId" value={currentOptions.accountId || ''} onChange={onChange} required>
                            <option value="" disabled>-- Select an account --</option>
                            {accounts.map(acc => (
                                <option key={acc._id} value={acc._id}>
                                    {acc.platform} - {acc.username}
                                </option>
                            ))}
                        </select>
                        {accounts.length === 0 && <small style={{ color: 'orange' }}>No accounts found. Please add one in Account Management.</small>}
                    </div>
                    <div className="form-field">
                        <label htmlFor="loginUrl">Login URL: <span style={{ color: 'red' }}>*</span></label>
                        <input type="url" id="loginUrl" name="loginUrl" value={currentOptions.loginUrl || ''} onChange={onChange} required placeholder="https://example.com/login" />
                    </div>
                    <div className="form-field">
                        <label htmlFor="usernameSelector">Username Field Selector: <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="usernameSelector" name="usernameSelector" value={currentOptions.usernameSelector || ''} onChange={onChange} required placeholder="e.g., #username, input[name='user']" />
                    </div>
                    <div className="form-field">
                        <label htmlFor="passwordSelector">Password Field Selector: <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="passwordSelector" name="passwordSelector" value={currentOptions.passwordSelector || ''} onChange={onChange} required placeholder="e.g., #password, input[type='password']" />
                    </div>
                    <div className="form-field">
                        <label htmlFor="submitButtonSelector">Submit Button Selector: <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="submitButtonSelector" name="submitButtonSelector" value={currentOptions.submitButtonSelector || ''} onChange={onChange} required placeholder="e.g., button[type='submit']" />
                    </div>
                    <div className="form-field">
                        <label htmlFor="postLoginSelector">Post-Login Element Selector: <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="postLoginSelector" name="postLoginSelector" value={currentOptions.postLoginSelector || ''} onChange={onChange} required placeholder="An element only visible after login (e.g., #logout-button)" />
                        <small>A selector for an element that must be visible on the page after a successful login to confirm it worked.</small>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginConfigSection;