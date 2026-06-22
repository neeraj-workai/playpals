import { Storage } from '../storage/Storage';

export interface FamilyMember {
  id: string;
  name: string;
  avatarIdx: number;
  colorIdx: number;
}

const KEY = 'family';

export const FamilyProfiles = {
  list(): FamilyMember[] {
    try { return JSON.parse(Storage.getString(KEY, '[]')) as FamilyMember[]; }
    catch { return []; }
  },
  _save(list: FamilyMember[]): void {
    Storage.setString(KEY, JSON.stringify(list));
  },
  add(name: string, avatarIdx: number, colorIdx: number): FamilyMember {
    const list = this.list();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const m: FamilyMember = { id, name, avatarIdx, colorIdx };
    list.push(m);
    this._save(list);
    return m;
  },
  update(id: string, patch: Partial<Omit<FamilyMember, 'id'>>): void {
    this._save(this.list().map(m => m.id === id ? { ...m, ...patch } : m));
  },
  remove(id: string): void {
    this._save(this.list().filter(m => m.id !== id));
  },
  getById(id: string): FamilyMember | undefined {
    return this.list().find(m => m.id === id);
  },
};
