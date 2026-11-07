import ancientRelicTable from '../../public/data/tables/AncientRelic.json';
import adsBuffTable from '../../public/data/tables/AdsBuff.json';
import alchemySlotTable from '../../public/data/tables/AlchemySlot.json';
import attributeRuneTable from '../../public/data/tables/AttributeRune.json';
import attributeRuneLabTable from '../../public/data/tables/AttributeRuneLab.json';
import awakenTable from '../../public/data/tables/Awaken.json';
import cardTable from '../../public/data/tables/Card.json';
import cardSetTable from '../../public/data/tables/CardSet.json';
import cardStickerSetTable from '../../public/data/tables/CardStickerSet.json';
import charSkillTable from '../../public/data/tables/CharSkill.json';
import changeSkillTable from '../../public/data/tables/ChangeSkill.json';
import characterTable from '../../public/data/tables/Character.json';
import characterAffinityTable from '../../public/data/tables/CharacterAffinity.json';
import characterAwakenTable from '../../public/data/tables/CharacterAwaken.json';
import collectionTable from '../../public/data/tables/Collection.json';
import contentMissionTable from '../../public/data/tables/ContentMission.json';
import coreMasteryTable from '../../public/data/tables/CoreMastery.json';
import costumeTable from '../../public/data/tables/Costume.json';
import diaryStatTable from '../../public/data/tables/DiaryStat.json';
import diceOptionTable from '../../public/data/tables/DiceOption.json';
import figureStatTable from '../../public/data/tables/FigureStat.json';
import frameTable from '../../public/data/tables/Frame.json';
import iconTable from '../../public/data/tables/Icon.json';
import libraryTable from '../../public/data/tables/Library.json';
import masteryTable from '../../public/data/tables/Mastery.json';
import optionTable from '../../public/data/tables/Option.json';
import petTable from '../../public/data/tables/Pet.json';
import petRegionTable from '../../public/data/tables/PetRegion.json';
import relicTable from '../../public/data/tables/Relic.json';
import skillTable from '../../public/data/tables/Skill.json';
import skillPerkTable from '../../public/data/tables/SkillPerk.json';
import skillRuneTable from '../../public/data/tables/SkillRune.json';
import soulForgeTable from '../../public/data/tables/SoulForge.json';
import titleTable from '../../public/data/tables/Title.json';
import trainingTable from '../../public/data/tables/Training.json';
import vipTable from '../../public/data/tables/Vip.json';
import weaponCharTable from '../../public/data/tables/WeaponChar.json';
import weaponJobTable from '../../public/data/tables/WeaponJob.json';
import weaponLinkTable from '../../public/data/tables/WeaponLink.json';
import weaponTranscendTable from '../../public/data/tables/WeaponTranscend.json';
import type { StatTables } from '@/data/statTables';

/**
 * 시험용 표 묶음: public/data/tables 의 표 전체 (계산기 탭이 쓰는 표 + Vip · CharSkill · CharacterAwaken).
 * 필요한 표만 고르면 탭이 늘 때마다 빠지므로 전부 묶는다
 */
export function loadTestTables(): StatTables {
  return {
    AdsBuff: adsBuffTable,
    AncientRelic: ancientRelicTable,
    AlchemySlot: alchemySlotTable,
    AttributeRune: attributeRuneTable,
    AttributeRuneLab: attributeRuneLabTable,
    Awaken: awakenTable,
    Card: cardTable,
    CardSet: cardSetTable,
    CardStickerSet: cardStickerSetTable,
    CharSkill: charSkillTable,
    ChangeSkill: changeSkillTable,
    Character: characterTable,
    CharacterAffinity: characterAffinityTable,
    CharacterAwaken: characterAwakenTable,
    Collection: collectionTable,
    ContentMission: contentMissionTable,
    CoreMastery: coreMasteryTable,
    Costume: costumeTable,
    DiaryStat: diaryStatTable,
    DiceOption: diceOptionTable,
    FigureStat: figureStatTable,
    Frame: frameTable,
    Icon: iconTable,
    Library: libraryTable,
    Mastery: masteryTable,
    Option: optionTable,
    Pet: petTable,
    PetRegion: petRegionTable,
    Relic: relicTable,
    Skill: skillTable,
    SkillPerk: skillPerkTable,
    SkillRune: skillRuneTable,
    SoulForge: soulForgeTable,
    Title: titleTable,
    Training: trainingTable,
    Vip: vipTable,
    WeaponChar: weaponCharTable,
    WeaponJob: weaponJobTable,
    WeaponLink: weaponLinkTable,
    WeaponTranscend: weaponTranscendTable,
  } as StatTables;
}
