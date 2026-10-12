using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class FaseTres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NombreCompleto = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    EstaActivo = table.Column<bool>(type: "bit", nullable: false),
                    FechaCreacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RolReclamaciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolReclamaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RolReclamaciones_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RegistrosAuditoria",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UsuarioId = table.Column<int>(type: "int", nullable: true),
                    Accion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TipoEntidad = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EntidadId = table.Column<int>(type: "int", nullable: true),
                    FechaUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    Detalle = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegistrosAuditoria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RegistrosAuditoria_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UsuarioIniciosSesion",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioIniciosSesion", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_UsuarioIniciosSesion_Usuarios_UserId",
                        column: x => x.UserId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsuarioReclamaciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioReclamaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsuarioReclamaciones_Usuarios_UserId",
                        column: x => x.UserId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsuariosRoles",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false),
                    RoleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuariosRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_UsuariosRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UsuariosRoles_Usuarios_UserId",
                        column: x => x.UserId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsuarioTokens",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_UsuarioTokens_Usuarios_UserId",
                        column: x => x.UserId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublicacionesListas_UsuarioPublicadorId",
                table: "PublicacionesListas",
                column: "UsuarioPublicadorId");

            migrationBuilder.CreateIndex(
                name: "IX_ListasReproduccion_UsuarioCreadorId",
                table: "ListasReproduccion",
                column: "UsuarioCreadorId");

            migrationBuilder.CreateIndex(
                name: "IX_Exportaciones_UsuarioSolicitanteId",
                table: "Exportaciones",
                column: "UsuarioSolicitanteId");

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosMultimedia_UsuarioCargaId",
                table: "ArchivosMultimedia",
                column: "UsuarioCargaId");

            migrationBuilder.CreateIndex(
                name: "IX_Anuncios_UsuarioCreadorId",
                table: "Anuncios",
                column: "UsuarioCreadorId");

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosAuditoria_FechaUtc",
                table: "RegistrosAuditoria",
                column: "FechaUtc");

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosAuditoria_TipoEntidad_EntidadId",
                table: "RegistrosAuditoria",
                columns: new[] { "TipoEntidad", "EntidadId" });

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosAuditoria_UsuarioId",
                table: "RegistrosAuditoria",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "Roles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RolReclamaciones_RoleId",
                table: "RolReclamaciones",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioIniciosSesion_UserId",
                table: "UsuarioIniciosSesion",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioReclamaciones_UserId",
                table: "UsuarioReclamaciones",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "Usuarios",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "Usuarios",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosRoles_RoleId",
                table: "UsuariosRoles",
                column: "RoleId");

            migrationBuilder.AddForeignKey(
                name: "FK_Anuncios_Usuarios_UsuarioCreadorId",
                table: "Anuncios",
                column: "UsuarioCreadorId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosMultimedia_Usuarios_UsuarioCargaId",
                table: "ArchivosMultimedia",
                column: "UsuarioCargaId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Exportaciones_Usuarios_UsuarioSolicitanteId",
                table: "Exportaciones",
                column: "UsuarioSolicitanteId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ListasReproduccion_Usuarios_UsuarioCreadorId",
                table: "ListasReproduccion",
                column: "UsuarioCreadorId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PublicacionesListas_Usuarios_UsuarioPublicadorId",
                table: "PublicacionesListas",
                column: "UsuarioPublicadorId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Anuncios_Usuarios_UsuarioCreadorId",
                table: "Anuncios");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosMultimedia_Usuarios_UsuarioCargaId",
                table: "ArchivosMultimedia");

            migrationBuilder.DropForeignKey(
                name: "FK_Exportaciones_Usuarios_UsuarioSolicitanteId",
                table: "Exportaciones");

            migrationBuilder.DropForeignKey(
                name: "FK_ListasReproduccion_Usuarios_UsuarioCreadorId",
                table: "ListasReproduccion");

            migrationBuilder.DropForeignKey(
                name: "FK_PublicacionesListas_Usuarios_UsuarioPublicadorId",
                table: "PublicacionesListas");

            migrationBuilder.DropTable(
                name: "RegistrosAuditoria");

            migrationBuilder.DropTable(
                name: "RolReclamaciones");

            migrationBuilder.DropTable(
                name: "UsuarioIniciosSesion");

            migrationBuilder.DropTable(
                name: "UsuarioReclamaciones");

            migrationBuilder.DropTable(
                name: "UsuariosRoles");

            migrationBuilder.DropTable(
                name: "UsuarioTokens");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropIndex(
                name: "IX_PublicacionesListas_UsuarioPublicadorId",
                table: "PublicacionesListas");

            migrationBuilder.DropIndex(
                name: "IX_ListasReproduccion_UsuarioCreadorId",
                table: "ListasReproduccion");

            migrationBuilder.DropIndex(
                name: "IX_Exportaciones_UsuarioSolicitanteId",
                table: "Exportaciones");

            migrationBuilder.DropIndex(
                name: "IX_ArchivosMultimedia_UsuarioCargaId",
                table: "ArchivosMultimedia");

            migrationBuilder.DropIndex(
                name: "IX_Anuncios_UsuarioCreadorId",
                table: "Anuncios");
        }
    }
}
