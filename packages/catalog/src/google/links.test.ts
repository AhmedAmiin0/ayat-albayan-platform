import { describe, expect, it } from 'vitest';
import { driveFileLink, driveFolderLink, fileIdIn, folderIdIn, sheetLink } from './links.js';

const ID = 'Abc_DEF-1234567890';

describe('Google links (docs/24 §1)', () => {
  it('builds the three links the script writes', () => {
    expect(driveFileLink(ID)).toBe(`https://drive.google.com/file/d/${ID}/view`);
    expect(driveFolderLink(ID)).toBe(`https://drive.google.com/drive/folders/${ID}`);
    expect(sheetLink(ID)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/edit`);
  });

  it('reads a folder id from a plain link, a HYPERLINK formula or an open?id= link', () => {
    expect(folderIdIn(driveFolderLink(ID))).toBe(ID);
    expect(folderIdIn(`=HYPERLINK("${driveFolderLink(ID)}?usp=sharing","مجلد")`)).toBe(ID);
    expect(folderIdIn(`https://drive.google.com/open?id=${ID}`)).toBe(ID);
    expect(folderIdIn('مجلد الطالب')).toBeNull();
    expect(folderIdIn(42)).toBeNull();
  });

  it('reads a file or sheet id, never a folder id as a file', () => {
    expect(fileIdIn(driveFileLink(ID))).toBe(ID);
    expect(fileIdIn(sheetLink(ID))).toBe(ID);
    expect(fileIdIn(driveFolderLink(ID))).toBeNull();
    expect(fileIdIn(null)).toBeNull();
  });
});
