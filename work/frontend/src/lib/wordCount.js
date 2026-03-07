
export const calculateChapterWordCount = (content) => {
  if (!content) return 0;
  
  // Remove HTML tags
  const strippedContent = content.replace(/<[^>]*>/g, ' ');
  
  // Remove multiple spaces, newlines, tabs
  const cleanContent = strippedContent.replace(/\s+/g, ' ').trim();
  
  if (!cleanContent) return 0;
  
  // For CJK (Chinese/Japanese/Korean) characters, count each character
  // For other languages (English, etc.), count words by space
  const cjkRegex = /[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf\uf900-\ufaff\uff66-\uff9f]/g;
  
  const cjkMatches = cleanContent.match(cjkRegex);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  
  // Remove CJK characters to count remaining words (English, numbers, etc.)
  const nonCjkContent = cleanContent.replace(cjkRegex, ' ').trim();
  const nonCjkCount = nonCjkContent ? nonCjkContent.split(/\s+/).length : 0;
  
  return cjkCount + nonCjkCount;
};
