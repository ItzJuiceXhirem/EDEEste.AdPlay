using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class PanelNuevo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FotoActualizadaUtc",
                table: "Usuarios",
                type: "datetime2(3)",
                precision: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FotoClaveAlmacenamiento",
                table: "Usuarios",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FotoTipoMime",
                table: "Usuarios",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AnuncioReproduccionId",
                table: "EstadosPantallas",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PosicionReproduccion",
                table: "EstadosPantallas",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SegundoReproduccion",
                table: "EstadosPantallas",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FotoActualizadaUtc",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "FotoClaveAlmacenamiento",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "FotoTipoMime",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "AnuncioReproduccionId",
                table: "EstadosPantallas");

            migrationBuilder.DropColumn(
                name: "PosicionReproduccion",
                table: "EstadosPantallas");

            migrationBuilder.DropColumn(
                name: "SegundoReproduccion",
                table: "EstadosPantallas");
        }
    }
}
