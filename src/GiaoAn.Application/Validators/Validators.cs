using FluentValidation;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;

namespace GiaoAn.Application.Validators;

public static class ValidationExtensions
{
    public static async Task ValidateOrThrowAsync<T>(this IValidator<T> validator, T instance, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(instance, ct);
        if (result.IsValid) return;
        var errors = result.Errors.GroupBy(e => char.ToLowerInvariant(e.PropertyName[0]) + e.PropertyName[1..])
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray());
        throw new ValidationAppException(errors);
    }
}

internal static class Rules
{
    public static IRuleBuilderOptions<T, List<string>> TagRules<T>(this IRuleBuilder<T, List<string>> rb) =>
        rb.Must(t => t == null || t.Count <= 20).WithMessage("Tối đa 20 thẻ.")
          .Must(t => t == null || t.All(x => (x ?? "").Length <= 500)).WithMessage("Thẻ quá dài.");
    public static IRuleBuilderOptions<T, int?> GradeRule<T>(this IRuleBuilder<T, int?> rb) =>
        rb.Must(g => g == null || g is 10 or 11 or 12).WithMessage("Khối lớp phải là 10, 11 hoặc 12.");
}

public class DocumentSaveRequestValidator : AbstractValidator<DocumentSaveRequest>
{
    public DocumentSaveRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Vui lòng nhập tiêu đề.")
            .MaximumLength(300).WithMessage("Tiêu đề tối đa 300 ký tự.");
        RuleFor(x => x.DocumentTypeId).InclusiveBetween(1, 8).WithMessage("Vui lòng chọn loại tài liệu.");
        RuleFor(x => x.GradeLevelId).GradeRule();
        RuleFor(x => x.Description).MaximumLength(2000).WithMessage("Mô tả tối đa 2000 ký tự.");
        RuleFor(x => x.ContentText).MaximumLength(2_000_000).WithMessage("Nội dung văn bản quá dài.");
        RuleFor(x => x.ProgrammingLanguage).MaximumLength(50);
        RuleFor(x => x.Tags).TagRules();
    }
}

public class ExerciseSaveRequestValidator : AbstractValidator<ExerciseSaveRequest>
{
    public ExerciseSaveRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Vui lòng nhập tiêu đề.").MaximumLength(300);
        RuleFor(x => x.Statement).NotEmpty().WithMessage("Vui lòng nhập đề bài.").MaximumLength(200_000);
        RuleFor(x => x.Difficulty).InclusiveBetween(1, 4).WithMessage("Mức độ không hợp lệ.");
        RuleFor(x => x.GradeLevelId).GradeRule();
        RuleFor(x => x.Hint).MaximumLength(100_000);
        RuleFor(x => x.Solution).MaximumLength(200_000);
        RuleFor(x => x.SampleCode).MaximumLength(500_000);
        RuleFor(x => x.Tags).TagRules();
        RuleFor(x => x.ExerciseType).InclusiveBetween(1, 2).WithMessage("Loại bài tập không hợp lệ.");
    }
}

public class ExamMatrixTemplateSaveRequestValidator : AbstractValidator<ExamMatrixTemplateSaveRequest>
{
    public ExamMatrixTemplateSaveRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Vui lòng nhập tên mẫu ma trận.").MaximumLength(200);
        RuleFor(x => x.GradeLevelId).GradeRule();
        RuleFor(x => x.DurationMinutes).InclusiveBetween(5, 300).WithMessage("Thời gian làm bài từ 5 đến 300 phút.");
        RuleFor(x => x.TotalScore).GreaterThan(0).WithMessage("Tổng điểm phải lớn hơn 0.");
    }
}

public class SnippetSaveRequestValidator : AbstractValidator<SnippetSaveRequest>
{
    public SnippetSaveRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Vui lòng nhập tiêu đề.").MaximumLength(300);
        RuleFor(x => x.Language).NotEmpty().WithMessage("Vui lòng chọn ngôn ngữ.")
            .Must(l => Languages.All.Contains(l)).WithMessage("Ngôn ngữ không được hỗ trợ.");
        RuleFor(x => x.Code).NotEmpty().WithMessage("Vui lòng nhập mã nguồn.").MaximumLength(1_000_000);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.GradeLevelId).GradeRule();
        RuleFor(x => x.Tags).TagRules();
    }
}

public class TopicSaveRequestValidator : AbstractValidator<TopicSaveRequest>
{
    public TopicSaveRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Vui lòng nhập tên chủ đề.").MaximumLength(200);
        RuleFor(x => x.GradeLevelId).GradeRule();
    }
}

public class LessonSaveRequestValidator : AbstractValidator<LessonSaveRequest>
{
    public LessonSaveRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Vui lòng nhập tên bài học.").MaximumLength(200);
        RuleFor(x => x.TopicId).GreaterThan(0).WithMessage("Vui lòng chọn chủ đề.");
    }
}

public class PasswordRequestValidator : AbstractValidator<PasswordRequest>
{
    public PasswordRequestValidator() =>
        RuleFor(x => x.Password).NotEmpty().WithMessage("Vui lòng nhập mật khẩu.").MaximumLength(200);
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Vui lòng nhập mật khẩu hiện tại.");
        RuleFor(x => x.NewPassword).MinimumLength(4).WithMessage("Mật khẩu mới tối thiểu 4 ký tự.").MaximumLength(200);
    }
}
