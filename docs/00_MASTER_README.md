# 🧭 TravelTrack — Team Master Guide
> **"Travel Together, Stay Safe"** | React Native + Firebase + Wi-Fi Direct

---

## 👥 Who Does What (No Overlap!)

| Member | Role | Branch | Files They Own |
|--------|------|---------|----------------|
| **Member 1** | Project Setup & GitHub Manager | `setup/init` | Root config, AndroidManifest, package.json, GitHub repo |
| **Member 2** | Firebase & Authentication | `feature/firebase-auth` | `src/config/`, `src/services/authService.ts`, `src/services/firestoreService.ts`, `src/store/useAuthStore.ts` |
| **Member 3** | Wi-Fi Direct & GPS Engine | `feature/p2p-engine` | `src/services/wifiDirectManager.ts`, `src/services/tcpSocketManager.ts`, `src/services/locationService.ts`, `src/utils/geofence.ts` |
| **Member 4** | UI Screens & Navigation | `feature/ui-screens` | `src/screens/`, `src/navigation/`, `src/theme/` |
| **Member 5** | Components, Alerts & State | `feature/components-alerts` | `src/components/`, `src/services/alertManager.ts`, `src/store/useTrackingStore.ts`, `src/hooks/` |

---

## 🔁 GitHub Workflow — Everyone Must Follow This!

### One-time setup (everyone does this once)
```bash
# 1. Clone the repo (after Member 1 creates it)
git clone https://github.com/YOUR_TEAM/TravelTrack.git
cd TravelTrack

# 2. Install dependencies
npm install

# 3. Switch to YOUR branch (replace with your branch name)
git checkout -b feature/firebase-auth   # Member 2 example
```

### Daily workflow (every single day)
```bash
# Step 1 — Pull latest changes from main so you stay up to date
git checkout main
git pull origin main

# Step 2 — Go back to your branch and merge in the updates
git checkout feature/firebase-auth    # your branch
git merge main

# Step 3 — Do your work, then save it
git add .
git commit -m "feat: add login screen firebase auth"

# Step 4 — Push your work to GitHub
git push origin feature/firebase-auth
```

### When your task is done — create a Pull Request
1. Go to GitHub → your repo → "Pull requests" tab
2. Click "New pull request"
3. Set **base: main** ← **compare: your-branch**
4. Add a description of what you did
5. Tag all team members to review
6. Member 1 merges it

---

## ⚠️ Golden Rules to Avoid Collisions

1. **Never edit a file that belongs to another member** — see the table above
2. **Never push directly to `main`** — always use Pull Requests
3. **Pull from main every morning** before starting work
4. **If two people need to share data** — use the shared Zustand store (`src/store/`) and types (`src/types/`) — Member 5 owns these, others only read them
5. **Commit messages format:** `feat: what you did` or `fix: what you fixed`

---

## 📁 Full Project Folder Map

```
TravelTrack/
├── android/                    ← Member 1 sets up
├── src/
│   ├── config/                 ← Member 2
│   ├── navigation/             ← Member 4
│   ├── screens/                ← Member 4
│   ├── components/             ← Member 5
│   ├── services/
│   │   ├── authService.ts      ← Member 2
│   │   ├── firestoreService.ts ← Member 2
│   │   ├── wifiDirectManager.ts← Member 3
│   │   ├── tcpSocketManager.ts ← Member 3
│   │   ├── locationService.ts  ← Member 3
│   │   └── alertManager.ts     ← Member 5
│   ├── store/
│   │   ├── useAuthStore.ts     ← Member 2
│   │   ├── useTrackingStore.ts ← Member 5
│   │   └── useSettingsStore.ts ← Member 5
│   ├── utils/
│   │   ├── geofence.ts         ← Member 3
│   │   ├── permissions.ts      ← Member 3
│   │   └── constants.ts        ← Member 1
│   ├── types/                  ← Member 1 creates skeleton, Member 5 fills in
│   ├── hooks/                  ← Member 5
│   ├── theme/                  ← Member 4
│   └── assets/                 ← Member 4
├── package.json                ← Member 1 (others don't touch!)
└── index.js                    ← Member 1
```

---

## 🗓️ Suggested Timeline

| Week | Focus |
|------|-------|
| Week 1 | Member 1 sets up repo + project. Everyone clones. Member 2 starts Firebase. |
| Week 2 | Member 3 builds Wi-Fi Direct engine. Member 4 builds screens (with dummy data). Member 5 builds components. |
| Week 3 | Everyone connects their parts together. Integration testing on 2 phones. |
| Week 4 | Bug fixing, polish, final testing, demo preparation. |

---

## 📞 Need Help?

- **Build won't run:** Tell Member 1 — it's usually a setup/config issue
- **Firebase error:** Tell Member 2
- **Wi-Fi Direct/GPS not working:** Tell Member 3
- **Screen looks wrong:** Tell Member 4
- **Alert not firing / state not updating:** Tell Member 5
