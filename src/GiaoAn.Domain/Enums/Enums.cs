namespace GiaoAn.Domain.Enums;

public enum DocumentTypeKind
{
    LessonPlan = 1, Lecture = 2, Exercise = 3, Exam = 4,
    SourceCode = 5, Reference = 6, Worksheet = 7, Other = 8
}

public enum Difficulty { Recognize = 1, Understand = 2, Apply = 3, AdvancedApply = 4 }

public enum ExerciseType { MultipleChoice = 1, EssayOrCoding = 2 }

public enum TeachingStatus { Untaught = 0, Taught = 1, NeedsAdjustment = 2, Compensated = 3 }

public enum BackupKind { Backup = 1, Restore = 2 }
