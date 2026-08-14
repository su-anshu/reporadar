import { get, set } from 'idb-keyval';
import { DailySnapshot, GitHubRepo } from '../types';

const SNAPSHOTS_KEY = 'rr_snapshots';

export async function getSnapshots(): Promise<DailySnapshot[]> {
  const data = await get<DailySnapshot[]>(SNAPSHOTS_KEY);
  return data || [];
}

export async function saveSnapshot(repos: GitHubRepo[]): Promise<void> {
  if (!repos.length) return;
  const today = new Date().toISOString().split('T')[0];
  let snapshots = await getSnapshots();
  
  let todaySnapshot = snapshots.find(s => s.date === today);
  if (!todaySnapshot) {
    todaySnapshot = { date: today, repos: {} };
    snapshots.push(todaySnapshot);
    // Sort by date ascending
    snapshots.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  for (const repo of repos) {
    todaySnapshot.repos[repo.full_name] = {
      stars: repo.stargazers_count,
      forks: repo.forks_count
    };
  }
  
  // Keep last 90 days
  if (snapshots.length > 90) {
    snapshots = snapshots.slice(-90);
  }
  
  await set(SNAPSHOTS_KEY, snapshots);
}

export async function getRepoVelocity(fullName: string): Promise<{ velocity: number, days: number } | null> {
  const snapshots = await getSnapshots();
  if (snapshots.length < 2) return null;
  
  let oldest: {date: string, stars: number} | null = null;
  let newest: {date: string, stars: number} | null = null;

  for (const s of snapshots) {
    if (s.repos[fullName]) {
      if (!oldest) {
        oldest = { date: s.date, stars: s.repos[fullName].stars };
      }
      newest = { date: s.date, stars: s.repos[fullName].stars };
    }
  }

  if (!oldest || !newest || oldest.date === newest.date) return null;

  const d1 = new Date(oldest.date).getTime();
  const d2 = new Date(newest.date).getTime();
  const daysDiff = Math.max(1, (d2 - d1) / (1000 * 60 * 60 * 24));
  const starsDiff = newest.stars - oldest.stars;

  return { velocity: starsDiff / daysDiff, days: daysDiff };
}

export async function getTopVelocityRepos(): Promise<{ fullName: string; velocity: number }[]> {
  const snapshots = await getSnapshots();
  if (snapshots.length < 2) return [];

  const repoNames = new Set<string>();
  for (const s of snapshots) {
    Object.keys(s.repos).forEach(name => repoNames.add(name));
  }

  const results: { fullName: string; velocity: number }[] = [];
  for (const fullName of repoNames) {
    const v = await getRepoVelocity(fullName);
    if (v && v.velocity > 0) {
      results.push({ fullName, velocity: v.velocity });
    }
  }

  return results.sort((a, b) => b.velocity - a.velocity);
}
