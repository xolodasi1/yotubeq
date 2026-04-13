import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export const safeFormatDistanceToNow = (dateInput: any, options: { addSuffix?: boolean; locale?: any } = { addSuffix: true, locale: ru }) => {
  if (!dateInput) return 'недавно';
  
  try {
    let date: Date;
    
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (dateInput?.seconds) {
      date = new Date(dateInput.seconds * 1000);
    } else {
      date = new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return 'недавно';
    
    return formatDistanceToNow(date, options);
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'недавно';
  }
};
