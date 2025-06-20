document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.email) {
        // Redirect to login if not authenticated
        window.location.href = '/';
        return;
    }

    // Update user information in the dashboard
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('welcomeMessage').textContent = `Welcome, ${user.name}!`;
    const userCredits = document.getElementById('userCredits');
    const dashboardCredits = document.getElementById('dashboardCredits');
    function updateCreditsDisplay(credits) {
        if (userCredits) userCredits.textContent = `Credits: ${credits ?? 0}`;
        if (dashboardCredits) dashboardCredits.textContent = credits ?? 0;
        if (infoBox) {
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-user'></i> Welcome, ${user.name || user.email}!</div><div class='info-box-content'>You have <strong>${credits ?? 0} credits</strong>. Use the options above to manage your account.</div>`;
        }
    }

    // Fetch latest user profile from backend and update credits
    async function refreshUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    updateCreditsDisplay(data.user.credits);
                }
            }
        } catch (err) {
            // Ignore network errors for now
        }
    }
    refreshUserProfile();

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function() {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/';
    });

    // Add click handlers for stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            showNotification(`${title} feature coming soon!`, 'info');
        });
    });

    // Verify token with backend
    verifyToken(token);

    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${getNotificationColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-size: 14px;
            font-weight: 500;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }

    function getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    function getNotificationColor(type) {
        switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            default: return '#667eea';
        }
    }

    // Verify token with backend
    async function verifyToken(token) {
        try {
            const response = await fetch(`${window.location.origin}/api/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                // Token is invalid, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            const data = await response.json();
            if (data.success) {
                // Token is valid, update user info if needed
                console.log('Token verified successfully');
            }
        } catch (error) {
            console.error('Token verification error:', error);
            // On network error, we'll keep the user logged in
            // but could implement a retry mechanism
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + L for logout
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            document.getElementById('logoutBtn').click();
        }
        
        // Escape key to close any open modals (if implemented)
        if (e.key === 'Escape') {
            // Close any open modals or dropdowns
        }
    });

    // Add hover effects for stat cards
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Auto-refresh token (optional - implement if needed)
    // setInterval(() => {
    //     verifyToken(token);
    // }, 5 * 60 * 1000); // Check every 5 minutes

    // Show welcome message
    setTimeout(() => {
        showNotification(`Welcome back, ${user.name || user.email}!`, 'success');
    }, 1000);

    // Dynamic Info Box logic
    const infoBox = document.getElementById('infoBoxMessage');
    if (statCards.length && infoBox) {
        if (statCards[0]) statCards[0].addEventListener('click', () => {
            // Scheduling Call logic
            infoBox.innerHTML = `
                <div class='info-box-title'><i class='fas fa-calendar-plus'></i> Scheduling Call</div>
                <div class='info-box-content'>
                    <form id="scheduleCallForm" class="schedule-call-form">
                        <div style="margin-bottom: 1rem;">
                            <label for="callName">Name</label><br>
                            <input type="text" id="callName" name="callName" required style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="callPhone">Phone Number</label><br>
                            <input type="tel" id="callPhone" name="callPhone" required pattern="[0-9\\-\\+\\s\\(\\)]{7,}" style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="callTime">Time</label><br>
                            <input type="datetime-local" id="callTime" name="callTime" required style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <button type="submit" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">Schedule</button>
                    </form>
                </div>
            `;
            // Add form submit handler
            const scheduleForm = document.getElementById('scheduleCallForm');
            if (scheduleForm) {
                scheduleForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const name = document.getElementById('callName').value.trim();
                    const phone = document.getElementById('callPhone').value.trim();
                    const time = document.getElementById('callTime').value;
                    if (!name || !phone || !time) {
                        showNotification('Please fill in all fields', 'error');
                        return;
                    }
                    try {
                        const response = await fetch('/api/schedule-call', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ name, phone, time })
                        });
                        const data = await response.json();
                        if (response.ok && data.success) {
                            showNotification('Call scheduled successfully!', 'success');
                            scheduleForm.reset();
                        } else {
                            showNotification(data.message || 'Failed to schedule call', 'error');
                        }
                    } catch (err) {
                        showNotification('Network error. Please try again.', 'error');
                    }
                });
            }
        });
        if (statCards[1]) statCards[1].addEventListener('click', async () => {
            // Scheduled Calls logic
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Loading your scheduled calls...</div>`;
            try {
                const response = await fetch('/api/scheduled-calls', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    if (data.calls.length === 0) {
                        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>You have no scheduled calls.</div>`;
                    } else {
                        const callsList = data.calls.map(call => `<li><strong>${call.name}</strong> (${call.phone})<br>${new Date(call.time).toLocaleString()}</li>`).join('');
                        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'><ul>${callsList}</ul></div>`;
                    }
                } else {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Failed to load scheduled calls.</div>`;
                }
            } catch (err) {
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Network error. Please try again.</div>`;
            }
        });
        if (statCards[2]) statCards[2].addEventListener('click', () => {
            // Report logic
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>Your report will appear here. (Feature coming soon!)</div>`;
        });
        if (statCards[3]) statCards[3].addEventListener('click', async () => {
            // Manage Questions logic
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Loading questions...</div>`;
            try {
                const response = await fetch('/api/questions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    renderQuestionsBox(data.questions);
                } else {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Failed to load questions.</div>`;
                }
            } catch (err) {
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Network error. Please try again.</div>`;
            }
        });
    }

    // Helper to render the questions management UI
    function renderQuestionsBox(questions) {
        let html = `<div style='margin-bottom:1rem;'>
            <button id='addQuestionBtn' style='background: #667eea; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer;'>Add Question</button>
        </div>`;
        html += `<ul id='questionsList'>`;
        questions.forEach((q, idx) => {
            html += `<li style='margin-bottom:0.5rem;'>
                <input type='text' value="${q}" data-idx='${idx}' class='question-input' style='width:60%; padding:0.3rem; border-radius:6px; border:1px solid #e5e7eb;'>
                <button class='saveQuestionBtn' data-idx='${idx}' style='margin-left:0.5rem;'>Save</button>
                <button class='deleteQuestionBtn' data-idx='${idx}' style='margin-left:0.5rem; color:#ef4444;'>Delete</button>
            </li>`;
        });
        html += `</ul>`;
        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>${html}</div>`;

        // Add event listeners
        document.getElementById('addQuestionBtn').onclick = () => {
            // Add a new empty question field to the list and re-render
            const updated = [...questions, ""];
            renderQuestionsBox(updated);
        };
        document.querySelectorAll('.saveQuestionBtn').forEach(btn => {
            btn.onclick = async (e) => {
                const idx = parseInt(btn.dataset.idx);
                const val = document.querySelector(`.question-input[data-idx='${idx}']`).value.trim();
                if (val) {
                    const updated = [...questions];
                    updated[idx] = val;
                    await updateQuestions(updated);
                } else {
                    showNotification('Question cannot be empty', 'error');
                }
            };
        });
        document.querySelectorAll('.deleteQuestionBtn').forEach(btn => {
            btn.onclick = async (e) => {
                const idx = parseInt(btn.dataset.idx);
                const updated = questions.filter((_, i) => i !== idx);
                await updateQuestions(updated);
            };
        });
    }

    // Helper to update questions via backend
    async function updateQuestions(newQuestions) {
        try {
            const response = await fetch('/api/questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ questions: newQuestions })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                renderQuestionsBox(data.questions);
                showNotification('Questions updated!', 'success');
            } else {
                showNotification(data.message || 'Failed to update questions', 'error');
            }
        } catch (err) {
            showNotification('Network error. Please try again.', 'error');
        }
    }

    // Add event listener for Contact Admin button in navbar
    const contactAdminBtn = document.getElementById('contactAdminBtn');
    if (contactAdminBtn) {
        contactAdminBtn.addEventListener('click', function() {
            showNotification('admin@example.com | +1 234 567 890', 'info');
        });
    }

    // Direct Call Modal Logic
    const directCallBtn = document.getElementById('directCallBtn');
    const directCallModal = document.getElementById('directCallModal');
    const closeDirectCallModal = document.getElementById('closeDirectCallModal');
    const directCallForm = document.getElementById('directCallForm');

    if (directCallBtn && directCallModal && closeDirectCallModal && directCallForm) {
        directCallBtn.addEventListener('click', () => {
            directCallModal.style.display = 'flex';
        });

        closeDirectCallModal.addEventListener('click', () => {
            directCallModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === directCallModal) {
                directCallModal.style.display = 'none';
            }
        });

        directCallForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phone = document.getElementById('directCallPhone').value.trim();
            if (!phone) {
                showNotification('Please enter a valid phone number', 'error');
                return;
            }

            try {
                const response = await fetch('/api/direct-call', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ phone })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showNotification('Call initiated! You will receive a call shortly.', 'success');
                    directCallModal.style.display = 'none';
                    directCallForm.reset();
                } else {
                    showNotification(data.message || 'Failed to initiate call.', 'error');
                }
            } catch (err) {
                showNotification('Network error. Please try again.', 'error');
            }
        });
    }
}); 