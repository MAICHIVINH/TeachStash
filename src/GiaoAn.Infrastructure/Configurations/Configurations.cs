using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GiaoAn.Infrastructure.Configurations;

public class DocumentTypeConfiguration : IEntityTypeConfiguration<DocumentType>
{
    public void Configure(EntityTypeBuilder<DocumentType> b) { b.Property(x => x.Name).HasMaxLength(100).IsRequired(); b.Property(x => x.Id).ValueGeneratedNever(); }
}
public class GradeLevelConfiguration : IEntityTypeConfiguration<GradeLevel>
{
    public void Configure(EntityTypeBuilder<GradeLevel> b) { b.Property(x => x.Name).HasMaxLength(50).IsRequired(); b.Property(x => x.Id).ValueGeneratedNever(); }
}
public class TopicConfiguration : IEntityTypeConfiguration<Topic>
{
    public void Configure(EntityTypeBuilder<Topic> b)
    {
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.HasOne(x => x.GradeLevel).WithMany().HasForeignKey(x => x.GradeLevelId).OnDelete(DeleteBehavior.SetNull);
    }
}
public class LessonConfiguration : IEntityTypeConfiguration<Lesson>
{
    public void Configure(EntityTypeBuilder<Lesson> b)
    {
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.HasOne(x => x.Topic).WithMany(t => t.Lessons).HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Cascade);
    }
}
public class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> b) { b.Property(x => x.Name).HasMaxLength(60).IsRequired(); b.Property(x => x.Key).HasMaxLength(60).IsRequired(); b.HasIndex(x => x.Key).IsUnique(); }
}
public class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> b)
    {
        b.Property(x => x.Title).HasMaxLength(300).IsRequired();
        b.Property(x => x.ProgrammingLanguage).HasMaxLength(50);
        b.HasIndex(x => new { x.IsDeleted, x.UpdatedAt });
        b.HasIndex(x => x.DocumentTypeId);
        b.HasOne(x => x.DocumentType).WithMany().HasForeignKey(x => x.DocumentTypeId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<GradeLevel>().WithMany().HasForeignKey(x => x.GradeLevelId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Topic).WithMany().HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Lesson).WithMany().HasForeignKey(x => x.LessonId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.File).WithOne(f => f.Document).HasForeignKey<DocumentFile>(f => f.DocumentId).OnDelete(DeleteBehavior.Cascade);
    }
}
public class DocumentFileConfiguration : IEntityTypeConfiguration<DocumentFile>
{
    public void Configure(EntityTypeBuilder<DocumentFile> b)
    {
        b.Property(x => x.StoredName).HasMaxLength(100).IsRequired();
        b.Property(x => x.RelativePath).HasMaxLength(300).IsRequired();
        b.Property(x => x.OriginalName).HasMaxLength(300).IsRequired();
        b.Property(x => x.Extension).HasMaxLength(20);
        b.Property(x => x.MimeType).HasMaxLength(150);
        b.HasIndex(x => x.RelativePath).IsUnique();
    }
}
public class DocumentTagConfiguration : IEntityTypeConfiguration<DocumentTag>
{
    public void Configure(EntityTypeBuilder<DocumentTag> b)
    {
        b.HasKey(x => new { x.DocumentId, x.TagId });
        b.HasOne(x => x.Document).WithMany(d => d.DocumentTags).HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}
public class ExerciseTagConfiguration : IEntityTypeConfiguration<ExerciseTag>
{
    public void Configure(EntityTypeBuilder<ExerciseTag> b)
    {
        b.HasKey(x => new { x.ExerciseId, x.TagId });
        b.HasOne(x => x.Exercise).WithMany(d => d.Tags).HasForeignKey(x => x.ExerciseId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}
public class CodeSnippetTagConfiguration : IEntityTypeConfiguration<CodeSnippetTag>
{
    public void Configure(EntityTypeBuilder<CodeSnippetTag> b)
    {
        b.HasKey(x => new { x.CodeSnippetId, x.TagId });
        b.HasOne(x => x.CodeSnippet).WithMany(d => d.Tags).HasForeignKey(x => x.CodeSnippetId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}
public class CodeSnippetConfiguration : IEntityTypeConfiguration<CodeSnippet>
{
    public void Configure(EntityTypeBuilder<CodeSnippet> b)
    {
        b.Property(x => x.Title).HasMaxLength(300).IsRequired();
        b.Property(x => x.Language).HasMaxLength(50).IsRequired();
        b.HasOne<GradeLevel>().WithMany().HasForeignKey(x => x.GradeLevelId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Topic).WithMany().HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Lesson).WithMany().HasForeignKey(x => x.LessonId).OnDelete(DeleteBehavior.SetNull);
    }
}
public class ExerciseConfiguration : IEntityTypeConfiguration<Exercise>
{
    public void Configure(EntityTypeBuilder<Exercise> b)
    {
        b.Property(x => x.Title).HasMaxLength(300).IsRequired();
        b.Property(x => x.Language).HasMaxLength(50);
        b.HasOne<GradeLevel>().WithMany().HasForeignKey(x => x.GradeLevelId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Topic).WithMany().HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Lesson).WithMany().HasForeignKey(x => x.LessonId).OnDelete(DeleteBehavior.SetNull);
    }
}
public class AppSettingConfiguration : IEntityTypeConfiguration<AppSetting>
{
    public void Configure(EntityTypeBuilder<AppSetting> b) { b.HasKey(x => x.Key); b.Property(x => x.Key).HasMaxLength(100); }
}
public class BackupHistoryConfiguration : IEntityTypeConfiguration<BackupHistory>
{
    public void Configure(EntityTypeBuilder<BackupHistory> b) { b.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20); b.Property(x => x.FilePath).HasMaxLength(500); }
}
