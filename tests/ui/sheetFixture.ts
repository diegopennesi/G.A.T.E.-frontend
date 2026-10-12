import type { Page } from '@playwright/test'
import { installApi, profile, campaign } from './apiFixture'
export async function installSheet(page: Page) {
  const state = await installApi(page)
  state.characters = [{ id: 'sheet-character', userId: profile.id, ownerProfileName: profile.profileName, name: 'Elara delle terre oltre il mare', nickname: 'La cartografa', portraitUrl: null, isNpc: false, campaignId: campaign.id, characterStatus: 'ACTIVE', createdAt: campaign.createdAt }]
  state.sheets['sheet-character'] = {
    characterId: 'sheet-character', campaignId: campaign.id, gameSystemCode: 'DND5E', sheetTypeCode: 'DND5E_PG', schemaVersion: 1,
    schemaJson: { blocks: [
      { key: 'identity', label: 'Identità e avventura', fields: [
        { key: 'class', label: 'Classe', type: 'select', required: true, options: [{ value: 'ranger', label: 'Ranger' }, { value: 'wizard', label: 'Mago' }] },
        { key: 'level', label: 'Livello', type: 'number', min: 1, max: 20, required: true },
        { key: 'story', label: 'Storia', type: 'textarea', helpText: 'La storia del tuo personaggio.' },
        { key: 'inspiration', label: 'Ispirazione', type: 'boolean' },
        { key: 'equipment', label: 'Equipaggiamento', type: 'tags' },
      ] },
      { key: 'abilities', label: 'Caratteristiche', fields: [{ key: 'strength', label: 'Forza', type: 'number', required: true, min: 1, max: 30, defaultValue: 10 }] },
    ] },
    dataJson: { 'identity.class': 'ranger', 'identity.level': 3, 'identity.story': 'Una cartografa tra le montagne.', 'identity.inspiration': false, 'identity.equipment': ['Mappa', 'Bussola'], 'abilities.strength': 14 },
    catalogOptions: {}, derivedJson: { 'abilities.strengthModifier': 2 }, hasTemplate: true, editable: true, pendingReview: null, updatedAt: campaign.createdAt,
  }
  return state
}
