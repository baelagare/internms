import { getState, persistDatabase, getScopedStudents } from '../../state/store.js';
import { showToast } from '../../components/ui/ToastManager.js';
import { icon } from '../../components/ui/Icons.js';
import { esc, initials } from '../../utils/html.js';

export function renderMessagesWorkspace(container) {
  const state = getState();
  const user = state.currentUser;
  if (!user) return;

  let contacts = [];
  if (user.role === 'student') {
    contacts = state.users.filter(
      u =>
        (u.role === 'coordinator' && u.college === user.college) ||
        (u.role === 'supervisor' && u.company === user.company) ||
        u.role === 'admin'
    );
  } else if (user.role === 'coordinator') {
    contacts = [
      ...getScopedStudents(user.college),
      ...state.users.filter(u => u.role === 'supervisor' || u.role === 'admin')
    ];
  } else if (user.role === 'supervisor') {
    contacts = [
      ...getScopedStudents(),
      ...state.users.filter(u => u.role === 'coordinator' || u.role === 'admin')
    ];
  } else {
    contacts = state.users.filter(u => u.id !== user.id);
  }

  if (!state.activeChatPartnerId && contacts.length > 0) {
    state.activeChatPartnerId = contacts[0].id;
  }

  const activePartner =
    contacts.find(c => c.id === state.activeChatPartnerId) ||
    contacts[0] || { id: 'admin', name: 'Dr. Roberto Silva', role: 'admin', title: 'University OJT Director' };

  const threadMessages = state.messages.filter(
    m =>
      (m.senderId === user.id && m.recipientId === activePartner.id) ||
      (m.senderId === activePartner.id && m.recipientId === user.id)
  );

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('message', { size: 18 })} Messages</h3>
          <p class="card-subtitle">Direct messages with your assigned coordinator, supervisor, or interns</p>
        </div>
        <span class="badge badge-blue">${contacts.length} Contacts</span>
      </div>

      <div class="chat-layout ${state.mobileChatThreadOpen ? 'mobile-thread-active' : ''}" id="chat-workspace-root">
        <aside class="chat-contacts" aria-label="Contacts">
          ${contacts
            .map(c => {
              const isSelected = c.id === activePartner.id;
              return `
                <button
                  type="button"
                  class="chat-contact-btn ${isSelected ? 'active' : ''}"
                  data-partner-id="${esc(c.id)}"
                >
                  <div class="user-avatar" style="width: 34px; height: 34px; font-size: 0.76rem;">
                    ${esc(initials(c.name))}
                  </div>
                  <div style="min-width: 0; flex: 1;">
                    <div style="font-weight: 700; font-size: 0.84rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${esc(c.name)}
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">
                      ${esc((c.role || '').toUpperCase())}${c.college ? ` · ${esc(c.college)}` : c.company ? ` · ${esc(c.company)}` : ''}
                    </div>
                  </div>
                </button>
              `;
            })
            .join('')}
        </aside>

        <section class="chat-thread-pane" aria-label="Conversation">
          <div style="padding: 0.85rem 1.15rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; background: var(--surface-white);">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <button type="button" class="btn btn-xs btn-secondary mobile-chat-back" id="btn-close-mobile-chat">
                ${icon('arrowLeft', { size: 14 })} Contacts
              </button>
              <div>
                <strong style="font-size: 0.92rem; color: var(--nemsu-blue-900);">${esc(activePartner.name)}</strong>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                  ${esc(activePartner.title || activePartner.program || activePartner.company || activePartner.role)}
                </div>
              </div>
            </div>
            <span class="badge badge-neutral">${esc((activePartner.role || 'User').toUpperCase())}</span>
          </div>

          <div class="chat-messages-scroll" id="chat-messages-scroll">
            ${
              threadMessages.length === 0
                ? `<div style="margin: auto; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">No messages with ${esc(activePartner.name)} yet.</div>`
                : threadMessages
                    .map(m => {
                      const isMe = m.senderId === user.id;
                      return `
                        <div class="chat-bubble ${isMe ? 'outgoing' : 'incoming'}">
                          <div style="font-size: 0.7rem; font-weight: 700; opacity: 0.8; margin-bottom: 0.2rem;">
                            ${esc(isMe ? 'You' : m.senderName)} · ${esc(m.time || 'Just now')}
                          </div>
                          <div>${esc(m.text)}</div>
                        </div>
                      `;
                    })
                    .join('')
            }
          </div>

          <form id="chat-send-form" style="padding: 0.85rem 1rem; border-top: 1px solid var(--border-subtle); display: flex; gap: 0.65rem; background: var(--surface-white);">
            <label for="chat-message-input" class="sr-only">Message to ${esc(activePartner.name)}</label>
            <input
              type="text"
              id="chat-message-input"
              class="form-input"
              placeholder="Message ${esc(activePartner.name)}…"
              required
            />
            <button type="submit" class="btn btn-primary">
              ${icon('send', { size: 15 })} Send
            </button>
          </form>
        </section>
      </div>
    </div>
  `;

  const scrollBox = container.querySelector('#chat-messages-scroll');
  if (scrollBox) {
    scrollBox.scrollTop = scrollBox.scrollHeight;
  }

  container.querySelectorAll('.chat-contact-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeChatPartnerId = btn.getAttribute('data-partner-id');
      state.mobileChatThreadOpen = true;
      renderMessagesWorkspace(container);
    });
  });

  const closeMobileChat = () => {
    state.mobileChatThreadOpen = false;
    const layout = container.querySelector('#chat-workspace-root');
    if (layout) layout.classList.remove('mobile-thread-active');
  };
  window.closeMobileChat = closeMobileChat;
  window.openMobileChat = partnerId => {
    if (partnerId) state.activeChatPartnerId = partnerId;
    state.mobileChatThreadOpen = true;
    renderMessagesWorkspace(container);
  };

  container.querySelector('#btn-close-mobile-chat')?.addEventListener('click', closeMobileChat);

  const sendForm = container.querySelector('#chat-send-form');
  const msgInput = container.querySelector('#chat-message-input');
  sendForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const text = msgInput?.value.trim();
    if (!text) return;

    state.messages.push({
      id: Date.now(),
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      recipientId: activePartner.id,
      text,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });

    await persistDatabase(false);
    renderMessagesWorkspace(container);
    showToast({
      title: 'Message sent',
      message: `Sent to ${activePartner.name}.`,
      type: 'success',
      durationMs: 2500
    });
  });
}
