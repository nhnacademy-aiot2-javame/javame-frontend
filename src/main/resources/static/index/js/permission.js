import { authHeader } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    const memberTableBody = document.querySelector('#memberTable tbody');

    try {
        const members = await fetchMembers();

        members.forEach(member => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${member.email}</td>
                <td>${member.name}</td>
                <td>${member.role}</td>
                <td>
                    <button class="grant-btn" data-id="${member.id}">허가</button>
                </td>
            `;

            memberTableBody.appendChild(row);
        });

        document.querySelectorAll('.grant-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const memberId = e.target.dataset.id;
                const success = await grantPermission(memberId);
                if (success) {
                    alert('권한이 부여되었습니다.');
                    location.reload();
                } else {
                    alert('권한 부여 실패');
                }
            });
        });

    } catch (err) {
        console.error('회원 목록 조회 실패:', err);
    }
});

async function fetchMembers() {
    const res = await fetch('https://javame.live/api/v1/members', {
        headers: {
            ...authHeader()
        }
    });
    if (!res.ok) throw new Error('회원 조회 실패');
    return await res.json();
}

async function grantPermission(memberId) {
    const res = await fetch(`https://javame.live/api/v1/members/${memberId}/permission`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader()
        },
        body: JSON.stringify({ access: true }) // 필요시 JSON 구조 조정
    });
    return res.ok;
}
