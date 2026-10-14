using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class Invitaciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Invitaciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Correo = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    NombreCompleto = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Rol = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TokenHash = table.Column<string>(type: "nchar(64)", fixedLength: true, maxLength: 64, nullable: false),
                    FechaCreacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    VenceUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    UsuarioCreadorId = table.Column<int>(type: "int", nullable: true),
                    FechaActivacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    UsuarioActivadoId = table.Column<int>(type: "int", nullable: true),
                    FechaRevocacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invitaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invitaciones_Usuarios_UsuarioActivadoId",
                        column: x => x.UsuarioActivadoId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Invitaciones_Usuarios_UsuarioCreadorId",
                        column: x => x.UsuarioCreadorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Invitaciones_Correo",
                table: "Invitaciones",
                column: "Correo");

            migrationBuilder.CreateIndex(
                name: "IX_Invitaciones_TokenHash",
                table: "Invitaciones",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invitaciones_UsuarioActivadoId",
                table: "Invitaciones",
                column: "UsuarioActivadoId");

            migrationBuilder.CreateIndex(
                name: "IX_Invitaciones_UsuarioCreadorId",
                table: "Invitaciones",
                column: "UsuarioCreadorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Invitaciones");
        }
    }
}
