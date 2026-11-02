namespace GiaoAn.Domain.Common;

public abstract class Entity { public int Id { get; set; } }

public interface ISoftDeletable { bool IsDeleted { get; set; } DateTime? DeletedAt { get; set; } }
